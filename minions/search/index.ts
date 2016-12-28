import * as alchemy from '../../lib/alchemy'
import { MinionModule, MinionResult, SlackMessage } from '../../types'
import * as context from '../context'
import * as alchemize from '../alchemize'
import * as links from '../links'

const searchers = [
	require('./reddit'),
]

const thresholds = {
	concepts: 0.9,
	entities: 0.8,
	keywords: 0.9,
	taxonomy: 0.7
};

export interface SearchResult {
	message: string,
	url: string,
	source: string,
	score: number,
	alchemized: alchemy.AllTheThings
}

function* onMessage(message : SlackMessage & context.Response & alchemize.Response) : Iterator<Promise<MinionResult>> {

	let context = {
		concepts: [] as any[],
		entities: [] as any[],
		keywords: [] as any[],
		taxonomy: [] as any[],
		emotions: [] as any[],
		relations: [] as any[],
		sentiment: 0,
		imageKeywords: [] as any[],
		dates: [] as any[]
	}

	message.context = message.context || context;

	const msg = Object.assign({}, message, {
		context: {
			concepts: message.context.concepts.filter((c) => parseFloat(c.relevance) > thresholds.concepts),
			entities: message.context.entities.filter((c) => parseFloat(c.relevance) > thresholds.entities)
		},
		alchemy: {
			concepts: message.alchemy.concepts.filter((c) => parseFloat(c.relevance) > thresholds.concepts),
			entities: message.alchemy.entities.filter((c) => parseFloat(c.relevance) > thresholds.entities),
			keywords: message.alchemy.keywords.filter((c) => parseFloat(c.relevance) > thresholds.keywords),
			taxonomy: message.alchemy.taxonomy.filter((c) => parseFloat(c.relevance) > thresholds.taxonomy)
		}
	})

	const merged = [...msg.context.concepts, ...msg.context.entities, ...msg.alchemy.concepts, ...msg.alchemy.entities, ...msg.alchemy.keywords];

	if(merged.length < 4)
		return undefined;

	return Promise.all(searchers.map(searcher => searcher.search(msg)))
		.then(engine_results                  => engine_results.filter(res => res && res.length > 0))
		.then(engine_results                  => flatten(engine_results))
		.then(flattened_results               => Promise.all(flattened_results.map(analyze)))
		.then(analyzed_results                => rank(analyzed_results, msg, thresholds))
		.then(ranked                          => ranked[0])
		.then(winner                          => winner == undefined ? false : { text: winner.message, send: true })
		.catch(err                            => console.error('search error', err))
}

const analyze = (search_result : SearchResult) : Promise<SearchResult> => {
	// dont re-analyzed if it was already done
	if(search_result.alchemized) {
		return Promise.resolve(search_result);
	}

	return alchemy.getAllTheThings(search_result.url, 'url', true, 5000)
		.then(alchemized => Object.assign({}, search_result, { alchemized }))
		.catch(err => Object.assign({}, search_result, {
			alchemized: {
				concepts: [],
				keywords: [],
				entities: [],
				taxonomy: [],
				imageKeywords: []
			}
		}))
}

const flatten = (engine_results : SearchResult[][]) : SearchResult[]  => {

	const normalized = engine_results.map(engine_result => {
		const total = engine_result.reduce((agg, curr) => agg + curr.score, 0);
		return engine_result.map(r => Object.assign({}, r, { score: r.score / total }));
	});

	return normalized.reduce((agg, curr) => [...agg, ...curr], []);
}

/*
	analyzed results: [
		{
			url,
			alchemized:
				{ concepts, entities, keywords, taxonomy, emotions, relations, sentiment, imageKeywords, dates}
		}]
*/
const rank = (analyzed_results : SearchResult[], original_message : SlackMessage & context.Response & alchemize.Response, thresholds : any) => {

	let context = {
		concepts: [] as any[],
		entities: [] as any[]
	};

	const { concepts, keywords, entities } = original_message.alchemy;

	return analyzed_results
		.map(res => {
			const post_concepts = res.alchemized.concepts
				.filter((c) => parseFloat(c.relevance > thresholds.concepts));
			const post_entities = res.alchemized.entities
				.filter((c) => parseFloat(c.relevance) > thresholds.entities || (c.type == 'Person' && parseFloat(c.relevance) > thresholds.entities - 0.1));
			const post_keywords = res.alchemized.keywords
				.filter((c) => parseFloat(c.relevance) > thresholds.keywords);
			const post_image_keywords = res.alchemized.imageKeywords
				.filter((c) => parseFloat(c.score) > 0.3);

			return Object.assign({}, res, {
				context_score: percentOverlap(
					[...post_concepts, ...post_entities, ...post_keywords, ...post_image_keywords],
					[...concepts, ...keywords, ...entities],
					[...context.entities, ...context.concepts]
				)
			});
		})
		.sort((a, b) => .5 * b.score + .5 * b.context_score - .5 * a.score + .5 * a.context_score)

}

//TODO: make this so it only takes 2 arrays? then you can weight the returned score however you want.
const percentOverlap = (list1 : any[], list2 : any[], list3 : any[]) => {
	list1 = list1.map(c => c.text.toLowerCase());
	list2 = list2.map(c => c.text.toLowerCase());
	list3 = list3.map(c => c.text.toLowerCase());

	let list2_perc = 0.0;
	let list3_perc = 0.0;
	for(let item of list1) {
		if(list2.indexOf(item) > -1) {
			list2_perc += 1;
		}
		if(list3.indexOf(item) > -1) {
			list3_perc += 1;
		}
	}

	const list2_overlap = list2.length ? list2_perc / list2.length : 0;
	const list3_overlap = list3.length ? list3_perc / list3.length : 0;

	return list2_overlap + list3_overlap / 2; // what if overlap with current is more important than context?
}

const mod = {
	onMessage,
	analyze,
	rank,
	thresholds,
	key: 'search',
	filter: (msg : SlackMessage & links.Response) => msg.links.length > 0 && msg.text.split(' ').length >= 15,
	requirements: ['alchemy', 'links']

}

export default mod;