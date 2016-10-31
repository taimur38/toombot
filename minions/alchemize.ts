import * as alchemy from '../lib/alchemy';
import { SlackMessage } from '../types';

interface Response {
	alchemy: alchemy.AllTheThings
}

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {

	const text = message.text;

	return alchemy.getAllTheThings(text)
		.then(things => ({ alchemy: things }))
		.catch((err : Error) => {
			console.log("Preprocessor: " + err);
            console.log(err);
			return;
		})
}

export default {
	onMessage,
	key: (msg : SlackMessage) => 'alchemy',
	requirements: [],
	filter: (msg : SlackMessage) => true
}
