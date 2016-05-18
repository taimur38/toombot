const tone = require('../lib/tone')

const Process = message => {
	return tone.annotate(message.text)
		.then(result => Object.assign({}, message, { tone: result }))
		.catch(err => { console.log(err); return message})
}

module.exports = {
	Process
}
