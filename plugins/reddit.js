const axios = require('axios');

const session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	}
});

const onMessage = message => {

	if(message.links.length == 0)
		return Promise.resolve(false);

	const link = message.links[0];
	let url = link.url;

	if(link.domain.startsWith("m."))
		url = url.replace("m.", "")

	if(url.match(/\.html/))
		url = url.split('?')[0]; // ignore params

	return session.get(`/search.json?q=url:${url}`)
		.then(rsp => rsp.data)
		.then(results => {
			const posts = results.data.children;

			if(posts.length == 0)
				return false;

			if(posts[0].data.num_comments == 0)
				return false;

			const top_permalink = posts[0].data.permalink;

			if(top_permalink.indexOf('?') > -1){
				const t = top_permalink.split('?')[0];
				return getComments(t.slice(0, t.length - 1));
			}

			return getComments(top_permalink);
		})
		.catch(err => console.log(err))
}

const getComments = permalink => session.get(`${permalink}.json`)
		.then(rsp => {
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
				.map(c => c.data)
				.filter(c => c.body.indexOf("[deleted]") == -1)
				.map(c => ({
					text: c.body,
					isLong: c.body.split(' ').length > 30,
					isDiscussed: 0, // something with replies
					isSummary: c.body.indexOf("tl;dr") > -1 || c.body.indexOf("tldr") > -1 || c.body.indexOf("summary") > -1 || c.body_html.indexOf("blockquote") > -1,
					isMedia: c.body.indexOf("http") > -1,
					isBot: c.body.match(/\b(bot|robot)\b/g) != null,
					isGilded: c.gilded > 0,
					score: c.score
				}))
				.filter(c => !c.isBot)
				.map(c => ({
					text: c.text,
					score: 2000 * c.isSummary + 200 * c.isMedia + 200 * c.isGilded + 100 * c.isLong + c.score
				}))
				.sort((a, b) => b.score - a.score)

			console.log(scored)

			return scored[0].text;
		})

module.exports = {
	onMessage
}
