let contexts = {}; //key is channel, value is previous transcripts
const interval = 5 * 60 * 1000; // 5 minutes
const key = 'context'
const alchemy = require('../lib/alchemy');

const Process = message => {

	let previousTranscripts = contexts[message.channel.id] || [];
	previousTranscripts.push(message)
	previousTranscripts = previousTranscripts.filter(t => t.timestamp > message.timestamp - interval)

	contexts[message.channel.id] = previousTranscripts;

	const transcript = previousTranscripts.reduce((agg, curr, idx) => idx == 0 ? curr.text : agg + '. ' + curr.text, '');

	return alchemy.getAllTheThings(transcript)
		.then(alchemized => ({
			[key]: alchemized
		}))
}

module.exports = {
	Process,
	key,
	requirements: []
}
