const axios = require("axios");
const auth = require('../constants')

const session = axios.create({
	baseURL: 'https://gateway.watsonplatform.net/tone-analyzer-beta/api',
	auth: auth.tone,
	headers: {
		'Content-Type': 'text/plain'
	}
});

function annotate(text) {
	return session.post('/v3/tone?version=2016-02-11', { text })
		.then(rsp => rsp.data.document_tone)
		.catch(err => throw new Error(JSON.stringify(err.data)))
}

module.exports = {
	annotate
}
