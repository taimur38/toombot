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
		return Promise.resolve(false);

	const url = found[0].slice(0, found[0].length - 1)

	return session.get(`/search.json?q=url:${url}`)
		.then(rsp => rsp.data)
		.then(results => {
			const posts = results.data.children;

			if(posts.length == 0)
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
		.then(comments => comments ? comments[0].data.body : false)

module.exports = {
	onMessage
}
