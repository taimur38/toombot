import * as axios from 'axios';
import { bot } from '../constants'
import * as analyzer from './search/index'
import * as commenter from './reddit'

import { MinionModule, MinionResult, SlackMessage } from '../types'
import * as context from './context'

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	}
})

function* onMessage(message : SlackMessage ) : Iterator<Promise<MinionResult>> {

	const response = yield Promise.resolve({
		send: true,
		text: 'hey',
		filter: (msg : SlackMessage) => msg.text.toLowerCase().indexOf('thoughts') > -1 || msg.text.toLowerCase().indexOf('think about') > -1 || msg.text.indexOf('what is') > -1 || msg.text.indexOf('testing') > -1 || msg.text.toLowerCase().indexOf('fact') > -1 || msg.text.toLowerCase().indexOf('learned') > -1,
		contextMatch: (msg : SlackMessage) => msg.user.id == message.user.id && msg.channel.id == message.channel.id,
		requirements: ['context', 'alchemy', 'links']
	});

	if(response.text.indexOf('thoughts') > -1) { //context
		return thoughts(response)
	}
	else if(response.text.indexOf('think about') > -1) { //now
		return specificThoughts(response)
	}
	else if(response.text.indexOf('what is') > -1) {
		return wiki(response)
	}
	else if(response.text.indexOf('fact') > -1 || response.text.indexOf('learned') > -1) {
		return getFact(response)
	}
	else
		return undefined;
}

function getFact(message : SlackMessage) : Promise<MinionResult> {
	const session = driver.session();

	return session.run(`
		MATCH (c:SlackChannel {id: {c_id} })--(m:Message)--(f:Fact)
		MATCH (m)--(u:User)
		with u.name as username, f.id as fact, rand() as number
		return username, fact
		order by number
		limit 1
	`, {
		c_id: message.channel.id
	})
	.then((res : any) => {
		const record = res.records[0]
		session.close();
		if(!record) {
			return false;
		}
		console.log(record.get('username'), record.get('fact'))
		return { text: `I learned ${record.get('fact')} from ${record.get('username')}`, send: true }
	})
	.catch((err : any) => {
		session.close();
		console.error(err)
	})
}

async function specificThoughts(response : SlackMessage) : Promise<MinionResult> {
	console.log('here')
	let topic = response.text.split("think about")[1].replace("?", "");
	return session.get(`/search.json?q=${topic}+nsfw:no+self:no`)
		.then(rsp => rsp.data)
		.then((results : any) => {
			let promises = [];
			const posts = results.data.children;

			if(posts.length == 0)
				throw new Error('no posts');

			let post = posts.filter((post : any) => post.data.url.indexOf('reddit.com') < 0 && !post.data.over_18)[0];

			promises.push(Promise.resolve(post.data.title + ': ' + post.data.url));

			if(post.data.num_comments != 0) {
				let top_permalink = post.data.permalink;
				if(top_permalink.indexOf('?') > -1){
					const t = top_permalink.split('?')[0];
					promises.push(commenter.getComments(t.slice(0, t.length - 1)).then(rsp => rsp.text));
				}
				else
					promises.push(commenter.getComments(top_permalink).then(rsp => rsp.text));
			}

			return Promise.all(promises)
				.then((results : any) => {
					let final_answer = '';
					for(let result of results) {
						if(result)
							final_answer = final_answer + "\n" + result;
					}
					return { text: final_answer, send: true };
				})
		})
		.catch((err : any) => {
			console.log(err);
			return { text: 'i have no thoughts on the matter', send: true } as MinionResult
		})
}

function wiki(response : SlackMessage) : Promise<MinionResult> {
	let topic = response.text.split("what is ")[1].replace("?", "").replace(" ", "%20");
	return Promise.resolve({ send: true, text: "https://en.wikipedia.org/wiki/" + topic });
}

async function thoughts(response : SlackMessage & context.Response) : Promise<MinionResult> {
	let concepts = response.context.concepts.filter(c => c.relevance > 0.4).sort((a,b) => b.relevance - a.relevance)
	let entities = response.context.entities.filter(c => c.relevance > 0.4).sort((a,b) => b.relevance - a.relevance);

	let concept_merge = [...entities, ...concepts].slice(0,2).reduce((all, c) => `${all} ${c.text}`, '');

	if(!concept_merge)
		return Promise.resolve({ text: 'i have no thoughts on the matter', send: true })

	return session.get(`/search.json?q=${concept_merge}+nsfw:no+self:no`)
		.then(rsp => rsp.data)
		.then((results : any) => {

			const posts = (results.data as any).children;

			if(posts.length == 0)
				return undefined;

			return posts
				.filter((post : any) => post.data.url.indexOf('reddit.com') < 0 && !post.data.over_18)
				.map((post) => ({
					message: post.data.title + ': ' + post.data.url,
					url: post.data.url,
					source: `/search.json?q=${concept_merge}+nsfw:no+self:no`,
					score: post.data.score // TODO: fill this out. currently just the reddit score - different search might have a score derived from how recent it is, how many responses it gets, whatever.
				}))
				.sort((a, b) => b.score - a.score)
				.slice(0,10);
		})
		.then(flattened_results               => Promise.all(flattened_results.map(analyzer.analyze)))
		.then(analyzed_results                => analyzer.rank(analyzed_results, response, analyzer.thresholds))
		.then(ranked                          => ranked[0])
		.then(winner                          => winner == undefined ? undefined : { text: winner.message, send: true })
		.catch(err => {
			return { text: 'i have no thoughts on the matter', send: true }
		})

}

const mod : MinionModule = {
	onMessage,
	key: 'hey',
	filter: msg => msg.text.startsWith(`hey ${bot.name}`) && msg.text.indexOf(bot.name) > -1
}

export default mod;
