import * as axios from 'axios';
import { SlackMessage, MinionResult, MinionModule } from '../types'
import * as alchemize from './alchemize'

const session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	}
})
function* onMessage(message : SlackMessage & alchemize.Response) : Iterator<Promise<MinionResult>> {

	let concepts = message.alchemy.concepts.filter((c) => parseFloat(c.relevance) > 0.7);
	let entities = message.alchemy.entities.filter((c) => parseFloat(c.relevance) > 0.7 || (c.type == 'Person' && parseFloat(c.relevance) > 0.5));

	let concept_merge = [...entities].reduce((all, c) => `${all} ${c.text}`, '');

	if(!concept_merge)
		return Promise.resolve(false);

	return session.get(`/search.json?q=${concept_merge}`)
		.then(rsp => rsp.data)
		.then(results => {

			const posts = results.data.children;

			if(posts.length == 0)
				return false;

			for(let post of posts) {
				if(post.data.url.indexOf('reddit.com') < 0 && !post.data.over_18)
					return post.data.url;
			}

			return false;
		})
		.catch(err => console.log(err))

}

const mod : MinionModule = {
	onMessage,
	key: 'redditEnrichment',
	requirements: ['alchemy'],
	filter: (msg : SlackMessage) => msg.text.split(' ').length > 5
}

export default mod;