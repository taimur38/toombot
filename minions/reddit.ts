import * as axios from 'axios';
import { Response } from './links';

const session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	}
});

function* onMessage(message : SlackMessage & Response) : Iterator<Promise<MinionResult>> {

	if(message.links.length == 0) {
		return Promise.resolve()
	}
	const link = message.links[0];
	let url = link.url;

	if(link.domain.startsWith("m."))
		url = url.replace("m.", "")

	if(url.match(/\.html/))
		url = url.split('?')[0]; // ignore params

	return session.get(`/search.json?q=url:${url}`)
		.then(rsp => rsp.data)
		.then((results : any) => {
			const posts = results.data.children;

			if(posts.length == 0) {
				return false;
			}

			if(posts[0].data.num_comments == 0) {
				return false;
			}

			if(posts[0].data.url != url) {
				return false;
			}

			const top_permalink = posts[0].data.permalink;

			if(top_permalink.indexOf('?') > -1){
				const t = top_permalink.split('?')[0];
				return getComments(t.slice(0, t.length - 1));
			}

			return getComments(top_permalink);
		})
		.catch(err => console.error("reddit error", err.data.message || err))
}

export const getComments = (permalink : SlackMessage) => session.get(`${permalink}.json`)
		.then((rsp : any) => {
			if(rsp.data && rsp.data.length >= 2)
				return rsp.data[1].data.children;

			return false;
		})
		.then(comments => {
			if(!comments)
				return false;

			if(comments.length == 1)
				return comments[0].data.body

			const scored = comments.slice(0, Math.min(5, comments.length - 1))
				.map((c : any) => c.data)
				.filter((c : any) => c.body.indexOf("[deleted]") == -1)
				.map((c : any) => ({
					text: c.body,
					isLong: c.body.split(' ').length > 50,
					isDiscussed: 0, // something with replies
					isSummary: c.body.indexOf("tl;dr") > -1 || c.body.indexOf("tldr") > -1 || c.body.indexOf("summary") > -1 || c.body_html.indexOf("blockquote") > -1,
					isMedia: c.body.indexOf("http") > -1,
					isBot: c.body.match(/\b(bot|robot)\b/g) != null,
					isGilded: c.gilded > 0,
					score: c.score
				}))
				.filter((c : any) => !c.isBot && !c.isLong)
				.map((c : any) => {
					return {
						text: c.text as string,
						score: 2000 * c.isSummary + 200 * c.isMedia + 200 * c.isGilded + c.score as number
					}
				})
				.sort((a : any, b : any) => b.score - a.score)

			//console.log(scored)

			return { text: scored[0] ? scored[0].text : false, send: true, threadReply: false };
		})

const mod : MinionModule = {
	onMessage,
	key: 'reddit',
	requirements: ['links']
}

export default mod;
