const axios = require('axios');
const alchemy = require('../lib/alchemy');

const onMessage = message => {

	if(!message.alchemy || !message.alchemy.keywords) {
		return false;
	}

	const keywords = message.alchemy.keywords;

    const total_sentiment = keywords.reduce((p, c) => p + parseFloat(c.sentiment.score || 0), 0)

	if(keywords.length > 0 && total_sentiment / keywords.length > 0.85) {
		return Promise.resolve('Hey, glad to hear!');
	}

	if(keywords.length > 0 && total_sentiment / keywords.length < -0.85) {
		return Promise.resolve('Hey, cheer up!');
	}

	return Promise.resolve(false)
}

module.exports = {
	onMessage
}
