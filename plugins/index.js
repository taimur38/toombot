
const wrapper = fn => message => fn(message).then(res => ({ content: res, channel: message.channel }))

module.exports = [
	wrapper(require('./reddit').onMessage),
    wrapper(require('./sentiment').onMessage),
    // wrapper(require('./reddit-enrichment').onMessage),
    wrapper(require('./image-tagging').onMessage),
	wrapper(require('./hot').onMessage)
]
