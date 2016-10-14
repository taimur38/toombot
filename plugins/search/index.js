const alchemy = require('../../lib/alchemy')

const searchers = [
	require('./reddit'),
]

const thresholds = {
	concepts: 0.9,
	entities: 0.8,
	keywords: 0.7
};

const onMessage = message => {

	if(!message.alchemy) {
		return Promise.resolve(false);
	}

	let context = {
		concepts: [],
		entities: [],
		keywords: [],
		taxonomy: []
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

	return Promise.all(searchers.map(searcher => searcher.search(message)))
		.then(engine_results                  => engine_results.filter(res => res && res.length > 0))
		.then(engine_results                  => flatten(engine_results))
		.then(flattened_results               => Promise.all(flattened_results.map(analyze)))
		.then(analyzed_results                => rank(analyzed_results, message, passiveSettings))
		.then(ranked                          => ranked[0])
		.then(winner                          => winner == undefined ? false : { url: winner.url })
		.catch(err => console.log(err))
}

const analyze = search_result => {
	// dont re-analyzed if it was already done
	if(search_result.alchemized) {
		return Promise.resolve(search_result);
	}

	return alchemy.getAllTheThings(search_result.url, 'url')
		.then(alchemized => Object.assign({}, search_result, { alchemized }))
}

const flatten = engine_results => {

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
const rank = (analyzed_results, original_message, passiveSettings ) => {

	let context = {
		concepts: [],
		entities: []
	};

    console.log(passiveSettings);
    const thresholds = passiveSettings.thresholds;

	if(original_message.context) {
		console.log("CONTEXT-PREFILTER", original_message.context.concepts)
		console.log("CONTEXT", context.concepts)
	}

	const concepts = original_message.alchemy.concepts
		.filter((c) => parseFloat(c.relevance) > thresholds.concepts)

	const entities = original_message.alchemy.entities
		.filter((c) => parseFloat(c.relevance) > thresholds.entities || (c.type == 'Person' && parseFloat(c.relevance) > thresholds.entities - 0.1))

	const keywords = original_message.alchemy.keywords
		.filter((c) => parseFloat(c.relevance) > thresholds.keywords)

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
const percentOverlap = (list1, list2, list3) => {
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

module.exports = {
	onMessage
}
