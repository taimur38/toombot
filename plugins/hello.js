function* onMessage(message) {

	if(message.text.indexOf('hello') == -1 || message.text.indexOf('toombot') == -1)
		return;

	const response = yield 'hey';

	console.log(response)
	if(response.text.indexOf('how are you') > -1) {
		yield 'good'
	}
	else
		return;
}

module.exports = {
	onMessage,
	key: msg => msg.user.id + '-hello'
}
