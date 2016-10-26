import axios from 'axios';
import { bot } from '../constants'
import * as analyzer from './search/index'
import * as commenter from './reddit'

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	}
})

function* onMessage(message) {

	const response = yield {
		text: 'hey',
		filter: msg => msg.text.indexOf('thoughts') > -1 || msg.text.indexOf('think about') > -1 || msg.text.indexOf('what is') > -1 || msg.text.indexOf('testing') > -1 || msg.text.indexOf('fact') > -1 || msg.text.indexOf('learned') > -1
	};

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
	else if(response.text.indexOf('testing') > -1) {
		const g = testing(message);
		while(true) {
			const output = g.next();
			console.log(output)
			if(output.done) {
				return output.value;
			}
			yield output.value;
		}
	}
	else
		return;
}

function* testing(message) {
	yield { text: 'hi', filter: msg => true };
	yield { text: 'go away', filter: msg => true };
}

function getFact(message) {
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
	.then(res => {
		const record = res.records[0]
		console.log(record.get('username'), record.get('fact'))
		return { text: `I learned ${record.get('fact')} from ${record.get('username')}`}
	})
	.catch(err => {
		console.error(err)
	})
}

function specificThoughts(message) {
	let topic = response.text.split("think about")[1].replace("?", "");
	return session.get(`/search.json?q=${topic}`)
		.then(rsp => rsp.data)
		.then(results => {
			let promises = [];
			const posts = results.data.children;

			if(posts.length == 0)
				return false;

			let post = posts.filter(post => post.data.url.indexOf('reddit.com') < 0 && !post.data.over_18)[0];

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
		})
		.then(results => {
			let final_answer = '';
			for(let result of results) {
				if(result)
					final_answer = final_answer + "\n" + result;
			}
			return {text: final_answer};
		})
		.catch(err => {
			console.log(err);
			return {text: 'i have no thoughts on the matter'}
		})
}

function wiki(message) {
	let topic = response.text.split("what is ")[1].replace("?", "").replace(" ", "%20");
	return {text: "https://en.wikipedia.org/wiki/" + topic};
}

function thoughts(message) {
	let concepts = message.context.concepts.filter(c => c.relevance > 0.4).sort((a,b) => b.relevance - a.relevance)
	let entities = message.context.entities.filter(c => c.relevance > 0.4).sort((a,b) => b.relevance - a.relevance);

	let concept_merge = [...entities, ...concepts].slice(0,2).reduce((all, c) => `${all} ${c.text}`, '');

	if(!concept_merge)
		return { text: 'i have no thoughts on the matter' }

	return session.get(`/search.json?q=${concept_merge}`)
		.then(rsp => rsp.data)
		.then(results => {

			const posts = results.data.children;

			if(posts.length == 0)
				return false;
			return posts
				.filter(post => post.data.url.indexOf('reddit.com') < 0 && !post.data.over_18)
				.map(post => ({
					message: post.data.title + ': ' + post.data.url,
					url: post.data.url,
					source: `/search.json?q=${concept_merge}`,
					score: post.data.score // TODO: fill this out. currently just the reddit score - different search might have a score derived from how recent it is, how many responses it gets, whatever.
				}))
				.sort((a, b) => b.score - a.score)
				.slice(0,10);
		})
		.then(flattened_results               => Promise.all(flattened_results.map(analyzer.analyze)))
		.then(analyzed_results                => analyzer.rank(analyzed_results, message, analyzer.thresholds))
		.then(ranked                          => ranked[0])
		.then(winner                          => winner == undefined ? false : {text: winner.message})
		.catch(err => {
			return { text: 'i have no thoughts on the matter' }
		})

}

module.exports = {
	onMessage,
	key: msg => msg.user.id + '-hey',
	filter: msg => msg.text.startsWith(`hey ${bot.name}`) && msg.text.indexOf(bot.name) > -1
}
