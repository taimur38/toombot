const Process = message => {

	return Promise.resolve(
		{ isQuestion: (
			message.text.split(' ').length >= 3 && (
				message.text.startsWith("what") ||
				message.text.startsWith("how") ||
				message.text.startsWith("who") ||
				message.text.indexOf("?") >= 0)
			)
		})
	);

}

module.exports = {
	Process,
	key: 'isQuestion',
	requirements: []
}
