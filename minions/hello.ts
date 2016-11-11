import { MinionModule, MinionResult, SlackMessage } from '../types';
import * as context from './context'

function* onMessage(message : SlackMessage) : Iterator<Promise<MinionResult>> {

	const response : SlackMessage & context.Response = yield Promise.resolve({
		filter: (msg : any) : boolean => true,
		text: 'testing',
		send: true,
		requirements: []
	})

	console.log('here')

	yield Promise.resolve({
		text: `${response.context.concepts.length} alchemy concepts in context`,
		send: true,
		filter: (msg : SlackMessage) => msg.text.indexOf('what are they') > -1
	});

	return Promise.resolve({
		text: `${response.context.concepts.map(c => c.text).join(',')}`,
		send: true
	})

}


const mod : MinionModule = {
	key: 'hello',
	onMessage
}

export default mod;
