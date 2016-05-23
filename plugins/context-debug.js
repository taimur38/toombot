const onMessage = message => Promise.resolve(message.context_correction || false);

module.exports = {
	onMessage
}
