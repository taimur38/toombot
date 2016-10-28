const alchemy = require('../lib/alchemy');

export function* onMessage(message : any) : Iterable<Promise<any>> {

	const text = message.text;

	return alchemy.getAllTheThings(text)
		.then((things : any) => ({ alchemy: things }))
		.catch((err : Error) => {
			console.log("Preprocessor: " + err);
            console.log(err);
			return;
		})
}

export const key = (msg: any) => 'alchemy';
export const requirements : string[] = [];
export const filter = (msg: any) : boolean => true;
