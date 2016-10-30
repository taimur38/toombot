import { MinionModule } from '../types';

function* onMessage(message : any) : Iterator<Promise<any>> {

	yield Promise.resolve({
		filter: (msg : any) : boolean => true,
		text: 'hello'
	})

	return Promise.resolve({
		text: "good"
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
