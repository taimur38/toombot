import { MinionModule, MinionResult, SlackMessage } from '../types';
import { AllTheThings } from '../lib/alchemy'

function* onMessage(message : SlackMessage) : Iterator<Promise<MinionResult>> {

	const response : SlackMessage & { context: AllTheThings } = yield Promise.resolve({
		filter: (msg : any) : boolean => true,
		text: 'testing',
		send: true,
		requirements: ['context']
	})

	console.log('here')

	return Promise.resolve({
		text: `${response.context.concepts.length} alchemy concepts`,
		send: true
	});
}

const key = (msg : any) : string => `${msg.user.id}-hello`
const requirements : string[] = [];
const filter = (msg : any) : boolean => true

const mod : MinionModule = {
	key,
	onMessage,
	requirements,
	filter
}

export default mod;
