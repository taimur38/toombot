
const wrapper = fn => message => fn(message).then(res => Object.assign({}, message, res))

module.exports = [
	wrapper(require('./alchemize').Process),
	wrapper(require('./temperature').Process),
	wrapper(require('./tonalize').Process),
	wrapper(require('./image-ize').Process),
	wrapper(require('./isQuestion').Process),
	wrapper(require('./links').Process)
]
