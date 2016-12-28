import * as axios  from 'axios'
import { SlackMessage } from '../../types'
import { SearchResult } from '../search'
import * as context from '../context'
import * as alchemized from '../alchemize'

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

const search = (message : SlackMessage & context.Response & alchemized.Response) : Promise<SearchResult[]> => {

	const context = message.context;
	console.log(message)

	const concept_merge = [...message.alchemy.entities, ...message.alchemy.concepts, ...message.alchemy.keywords]
		.reduce((agg, curr) => agg.indexOf(curr.text) > -1 ? agg : agg + " AND " + curr, '')

	const contextualized_merge = [...message.alchemy.entities, ...message.alchemy.concepts, ...message.alchemy.keywords, ...message.context.entities, ...message.context.concepts]
		.reduce((agg, curr) => {
			if(agg == '') {
				return curr.text;
			}

			if(agg.indexOf(curr.text) > -1)
				return agg

			return agg + " AND " + curr.text
		}, '')

	if(concept_merge == '')
		return Promise.resolve(false);

	const searchUrl = `/search.json?q=${contextualized_merge}+nsfw:no+self:no`
	console.log('reddit search:', searchUrl);
	return reddit_session.get(searchUrl)
		.then(rsp => {
			if(rsp.data)
				return rsp.data.data.children;
			throw new Error('no results')
		})
		.then(posts => {

			if(posts.length == 0)
				return false;

			return posts
				.filter((post : any) => post.data.url.indexOf('reddit.com') < 0 && !post.data.over_18)
				.map((post : any) => ({
					message: post.data.title + ': ' + post.data.url,
					url: post.data.url,
					source: searchUrl,
					score: post.data.score // TODO: fill this out. currently just the reddit score - different search might have a score derived from how recent it is, how many responses it gets, whatever.
				}))
				.sort((a : any, b : any) => b.score - a.score)
				.slice(0,10);
		})
		.catch(err => console.log('reddit error', err))
}

module.exports = {
	search
}
