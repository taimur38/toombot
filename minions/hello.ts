import { MinionModule, MinionResult, SlackMessage } from '../types';
import * as alchemy from './alchemize'

function* onMessage(message : SlackMessage) : Iterator<Promise<MinionResult>> {

	const response : SlackMessage & alchemy.Response = yield Promise.resolve({
		filter: (msg : any) : boolean => true,
		text: 'testing',
		send: true,
		requirements: ['alchemy'],
		contextMatch: (msg : SlackMessage) => msg.user.id == message.user.id && msg.channel.id == message.channel.id
	})

	console.log('here!!!!')

	yield Promise.resolve({
		text: `${response.alchemy.concepts.length} alchemy concepts in context`,
		send: true,
		filter: (msg : SlackMessage) => {
			console.log('filtererererr')
			return msg.text.indexOf('what are they') > -1
		}
	});

	return Promise.resolve({
		text: `${response.alchemy.concepts.map(c => c.text).join(',')}`,
		send: true
	})

}


const mod : MinionModule = {
	key: 'hello',
	onMessage
}

export default mod;
