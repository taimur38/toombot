const wrapper = fn => message => fn(message).then(res => ({ content: res, channel: message.channel.id }))

module.exports = [
	wrapper(require('./reddit').onMessage),
	wrapper(require('./sentiment').onMessage),
	wrapper(require('./reddit-enrichment').onMessage),
	wrapper(require('./image-tagging').onMessage),
	wrapper(require('./hot').onMessage),
	wrapper(require('./wolfram').onMessage),
	wrapper(require('./medium').onMessage)
]
