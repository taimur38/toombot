import * as alchemy from '../lib/alchemy';

interface Response {
	alchemy: alchemy.AllTheThings
}

function* onMessage(message : any) : Iterator<Promise<Response>> {

	const text = message.text;

	return alchemy.getAllTheThings(text)
		.then(things => ({ alchemy: things }))
		.catch((err : Error) => {
			console.log("Preprocessor: " + err);
            console.log(err);
			return;
		})
}

const key = (msg: any) => 'alchemy';
const requirements : string[] = [];
const filter = (msg: any) : boolean => true;

export default {
	onMessage,
	key,
	requirements,
	filter
}
