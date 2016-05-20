
const wrapper = fn => message => Object.assign({}, message, fn(message));

module.exports = [
	wrapper(require('./alchemize').Process),
	wrapper(require('./temperature').Process),
	wrapper(require('./tonalize').Process)
]
