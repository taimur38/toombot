const onMessage = message => {

	if(message.text.toLowerCase().indexOf('hell to the naw') > -1)
		return Promise.resolve("https://www.youtube.com/watch?v=-K7fCQlUhj0");

	return Promise.resolve(false);
}

module.exports = {
	onMessage
}
