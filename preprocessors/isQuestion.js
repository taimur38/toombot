const Process = message => {

	return Promise.resolve(
		{ isQuestion: (message.text.startsWith("what") || message.text.startsWith("how") || message.text.indexOf("?") >= 0) }
	);

}

module.exports = {
	Process,
	key: 'isQuestion',
	requirements: []
}
