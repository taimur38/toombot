const axios = require('axios')

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

const search = (message, { thresholds }) => {

	if(!message.alchemy)
		return Promise.resolve(false);

	const context = message.context;

	const concepts = message.alchemy.concepts
		.filter((c) => parseFloat(c.relevance) > thresholds.concepts)
		.filter(c => c.text != 'yeah'); // TODO: global filter
	const entities = message.alchemy.entities
		.filter((c) => parseFloat(c.relevance) > thresholds.entities || (c.type == 'Person' && parseFloat(c.relevance) > thresholds.entities - 0.1))
		.filter(c => c.text != 'yeah');
	const keywords = message.alchemy.keywords
		.filter((c) => parseFloat(c.relevance) > thresholds.keywords)
		.filter(c => c.text != 'yeah');

	const concept_merge = [...entities, ...concepts, ...keywords].reduce((all, c) => `${all} ${c.text}`, '');

	const contextualized_merge = [...entities, ...concepts, ...keywords, ...context.entities, ...context.concepts]
		.map(thing => `(${thing.text})`)
		.join(' AND ')

	if(!concept_merge)
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
				.filter(post => post.data.url.indexOf('reddit.com') < 0 && !post.data.over_18)
				.map(post => ({
					url: post.data.url,
					source: searchUrl,
					score: post.data.score // TODO: fill this out. currently just the reddit score - different search might have a score derived from how recent it is, how many responses it gets, whatever.
				}))
				.sort((a, b) => b.score - a.score)
				.slice(0,10);
		})
		.catch(err => console.log('reddit error'))
}

module.exports = {
	search
}
