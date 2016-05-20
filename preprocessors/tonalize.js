const tone = require('../lib/tone')

const Process = message => {
	return tone.annotate(message.text)
		.then(result => { tone: result })
		.catch(err => { console.log(err); return {}; })
}

module.exports = {
	Process
}
