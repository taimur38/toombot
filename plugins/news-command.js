import axios from 'axios';
import { bot } from '../../constants'
import * as analyzer from './search/index'
import * as commenter from './reddit'

const session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	}
})

function* onMessage(message) {

	if(message.text.indexOf('hey') == -1 || message.text.indexOf(bot.name) == -1)
		return;

	const response = yield 'hey';

	if(response.text.indexOf('thoughts') > -1) { //context
		let concepts = message.context.concepts.filter(c => c.relevance > 0.4).sort((a,b) => b.relevance - a.relevance)
		let entities = message.context.entities.filter(c => c.relevance > 0.4).sort((a,b) => b.relevance - a.relevance);

		let concept_merge = [...entities, ...concepts].slice(0,2).reduce((all, c) => `${all} ${c.text}`, '');

		if(!concept_merge)
			return 'i have no thoughts on the matter'

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
			.then(winner                          => winner == undefined ? false : winner.message)
			.catch(err => {
				console.log(err);
				return 'i have no thoughts on the matter'
			})
	}
	else if(response.text.indexOf('think about') > -1) { //now
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
						promises.push(commenter.getComments(t.slice(0, t.length - 1)));
					}
					else
						promises.push(commenter.getComments(top_permalink));
				}

				return Promise.all(promises)
			})
			.then(results => {
				let final_answer = '';
				for(let result of results) {
					if(result)
						final_answer = final_answer + "\n" + result;
				}
				return final_answer;
			})
			.catch(err => {
				console.log(err);
				return 'i have no thoughts on the matter'
			})
	}
	else if(response.text.indexOf('what is') > -1) {
		let topic = response.text.split("what is ")[1].replace("?", "").replace(" ", "%20");
		return "https://en.wikipedia.org/wiki/" + topic;
	}
	else
		return;
}

module.exports = {
	onMessage,
	key: msg => msg.user.id + '-hello'
}
