const axios = require('axios');

const session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	}
})
const onMessage = message => {

	const re = /(https?.\/\/+)([^ ]+)/g;
	const found = message.text.match(re)

	if(!found || found.length == 0)
		return Promise.reject("not a link");

	const url = found[0].slice(0, found[0].length - 1)

	return session.get(`/search.json?q=url:${url}`)
		.then(rsp => rsp.data)
		.then(results => {
			const posts = results.data.children;

			if(posts.length == 0)
				throw new Error('no posts');

			const top_permalink = posts[0].data.permalink;

			if(top_permalink.indexOf('?') > -1){
				const t = top_permalink.split('?')[0];
				return t.slice(0, t.length - 1);
			}

			return top_permalink;

		})
		.then(permalink => { return session.get(`${permalink}.json`)})
		.then(rsp => {
			if(rsp.data && rsp.data.length >= 2)
				return rsp.data[1].data.children;

			throw new Error('no comments')
		})
		.then(comments => comments[0].data.body)
		.catch(err => console.log(err))
}

module.exports = {
	onMessage
}
