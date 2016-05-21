const axios = require('axios');

const onMessage = message => {

	if(!message.alchemy || !message.alchemy.keywords) {
		return Promise.resolve(false);
	}

	const keywords = message.alchemy.keywords;
	let most_relevant = 0;
	let most_relevant_word = 'this';

	const total_sentiment = keywords.reduce((p, c) => {
		let sentiment = parseFloat(c.sentiment.score || 0);
		let relevance = parseFloat(c.relevance);
		if(relevance > most_relevant) {
			most_relevant = relevance;
			most_relevant_word = c.text;
		}
		return p + sentiment;
	}, 0)

	let emotions = message.alchemy.emotions;

	if(keywords.length > 0 && total_sentiment / keywords.length > 0.8) {
		if(parseFloat(emotions.joy) > 0.3) {
			return Promise.resolve(`Hey, glad to hear about ${most_relevant_word}, ${message.user.name}!`);
		}
	}

	if(keywords.length > 0 && total_sentiment / keywords.length < -0.8) {
		if(parseFloat(emotions.fear) > 0.3) {
			return Promise.resolve(`Hey, dont be scared about ${most_relevant_word}, ${message.user.name}!`);
		}

		if(parseFloat(emotions.anger) > 0.3) {
			return Promise.resolve(`Hey, calm down about ${most_relevant_word}, ${message.user.name}!`);
		}

		if(parseFloat(emotions.disgust) > 0.3) {
			return Promise.resolve(`Hey, ${most_relevant_word} does sound awful, ${message.user.name}!`);
		}

		if(parseFloat(emotions.sadness) > 0.3) {
			return Promise.resolve(`Hey, cheer up about ${most_relevant_word}, ${message.user.name}!`);
		}
	}

	return Promise.resolve(false)
}

module.exports = {
	onMessage
}
