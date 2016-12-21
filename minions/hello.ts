import { MinionModule, MinionResult, SlackMessage } from '../types';
import * as context from './context'

function* onMessage(message : SlackMessage) : Iterator<Promise<MinionResult>> {

	const response : SlackMessage & context.Response = yield Promise.resolve({
		text: 'testing',
		send: true,
		requirements: ['context'],
		contextMatch: (msg : SlackMessage) => msg.user.id == message.user.id && msg.channel.id == message.channel.id
	})

	yield Promise.resolve({
		text: `${response.context.concepts.length} alchemy concepts in context`,
		send: true,
		filter: (msg : SlackMessage) => msg.text.toLowerCase().indexOf('what are they') > -1,
		contextMatch: (msg : SlackMessage) => msg.user.id == message.user.id && msg.channel.id == message.channel.id
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
