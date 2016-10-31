import { MinionModule, MinionResult, SlackMessage } from '../types'
import { AllTheThings, getAllTheThings } from '../lib/alchemy'

let contexts = {}; //key is channel, value is previous transcripts
const interval = 5 * 60 * 1000; // 5 minutes
const key = 'context'

interface Response {
	context: AllTheThings
}

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {

	let previousTranscripts : SlackMessage[] = contexts[message.channel.id] || [];
	previousTranscripts.push(message)
	previousTranscripts = previousTranscripts.filter(t => t.timestamp.getTime() > message.timestamp.getTime() - interval)

	contexts[message.channel.id] = previousTranscripts;

	const transcript = previousTranscripts.reduce((agg, curr, idx) => idx == 0 ? curr.text : agg + '. ' + curr.text, '');

	return getAllTheThings(transcript)
		.then(alchemized => ({
			[key]: alchemized
		}))
}

const mod : MinionModule = {
	onMessage,
	key,
	requirements: []
}
