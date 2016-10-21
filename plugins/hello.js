import { bot } from '../constants';

function* onMessage(message) {

	const response = yield {
		filter: msg => msg.text.indexOf('how are you') > -1,
		text: 'hey'
	};

	return { text: 'good' }
}

module.exports = {
	onMessage,
	filter: msg => msg.text.indexOf('hello') > -1 &&  msg.text.indexOf(bot.name) > -1,
	key: msg => msg.user.id + '-hello'
}
