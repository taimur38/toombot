const wrapper = fn => message => fn(message).then(res => ({ response: res, message }))

module.exports = [
	wrapper(require('./reddit').onMessage),
	wrapper(require('./wolfram').onMessage),
	wrapper(require('./medium').onMessage),
	wrapper(require('./genius').onMessage),
	wrapper(require('./verge').onMessage),
	wrapper(require('./navigation').onMessage),
	wrapper(require('./arpan-fader').onMessage),
	wrapper(require('./update-nlc').onMessage),
	wrapper(require('./search').onMessage)
	//wrapper(require('./reddit-enrichment').onMessage),
	//wrapper(require('./image-tagging').onMessage),
	//wrapper(require('./hot').onMessage),
	//wrapper(require('./context-debug').onMessage)
	//wrapper(require('./sentiment').onMessage),
	//wrapper(require('./location').onMessage)
]
