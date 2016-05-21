const axios = require('axios');

const session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	}
})
const onMessage = message => {

	if(message.links.length == 0)
		return Promise.resolve(false);

	const url = message.links[0].url;
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
		.then(comments => comments ? comments[0].data.body : false)

module.exports = {
	onMessage
}
