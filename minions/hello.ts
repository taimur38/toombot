import { MinionModule, MinionResult } from '../types';

function* onMessage(message : any) : Iterator<Promise<MinionResult>> {

	const response = yield Promise.resolve({
		filter: (msg : any) : boolean => true,
		text: 'hello',
		send: true,
		requirements: ['alchemy']
	})

	return Promise.resolve({
		text: `${response.alchemy.concepts.length} alchemy concepts`,
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
