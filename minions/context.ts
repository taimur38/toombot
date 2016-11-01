import { MinionModule, MinionResult, SlackMessage } from '../types'
import { AllTheThings, getAllTheThings } from '../lib/alchemy'

let contexts = {}; //key is channel, value is previous transcripts
const interval = 5 * 60 * 1000; // 5 minutes

const key = 'context'
export interface Response {
	context: AllTheThings
}

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {

	let previousMessages: SlackMessage[] = [message];

	while(true) {
		const transcript = previousMessages.reduce((agg, curr, idx) => idx == 0 ? curr.text : agg + '. ' + curr.text, '');

		const nextMessage = yield getAllTheThings(transcript)
			.then(alchemized => ({
				context: alchemized
			}))
			.catch(err => console.error('context err', err))

		previousMessages.push(nextMessage);
		previousMessages = previousMessages
			.filter(t => t.timestamp.getTime() > message.timestamp.getTime() - interval)
	}
}

const mod : MinionModule = {
	onMessage,
	key: msg => key
}

export default mod;
