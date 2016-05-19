
const wrapper = fn => message => ({ content: fn(message), channel: message.channel })

module.exports = [
	wrapper(require('./reddit').onMessage),
    wrapper(require('./sentiment').onMessage)
]
