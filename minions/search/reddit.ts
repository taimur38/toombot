import * as axios  from 'axios'
import { SearchResult } from '../search'
import * as context from '../context'
import * as NLU from '../alchemize'

// search is a function that
// returns a promise that returns a list of:
// { url: '', alchemy: allthethings, score: } this score will be normalized by search orchestrator

const reddit_session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	},
	timeout: 3000
})

export const search = (message : SlackMessage & context.Response & NLU.Response) : Promise<SearchResult[]> => {

	const context = message.context;
	console.log(message)

	const concept_merge = [...message.NLU.entities, ...message.NLU.concepts, ...message.NLU.keywords]
		.reduce((agg, curr) => agg.indexOf(curr.text) > -1 ? agg : agg + " AND " + curr, '')

	const contextualized_merge = [...message.NLU.entities, ...message.NLU.concepts, ...message.NLU.keywords, ...message.context.NLU.entities, ...message.context.NLU.concepts]
		.reduce((agg, curr) => {
			if(agg == '') {
				return curr.text;
			}

			if(agg.indexOf(curr.text) > -1)
				return agg

			return agg + " AND " + curr.text
		}, '')

	if(concept_merge == '')
		return Promise.resolve(undefined);

	const searchUrl = `/search.json?q=${contextualized_merge}+nsfw:no+self:no`
	console.log('reddit search:', searchUrl);
	return reddit_session.get(searchUrl)
		.then(rsp => {
			if(rsp.data)
				return (<any>rsp.data).data.children;
			throw new Error('no results')
		})
		.then(posts => {
			let test = posts
				.filter((post : any) => post.data.url.indexOf('reddit.com') < 0 && !post.data.over_18)
				.map((post : any) : SearchResult => {
					return {
						message: post.data.title + ': ' + post.data.url,
						url: post.data.url,
						source: searchUrl,
						score: post.data.score,
						alchemized: undefined 
					}
				})
				.sort((a : any, b : any) => b.score - a.score)
				.slice(0,10);
		})
		.catch(err => { console.log('reddit error', err); return undefined; }) as Promise<SearchResult[]>
}
