import * as context from './context';

export interface Response {
	temperature: {
		raw_temperature: number,
		temperature: Temp
	}
}

enum Temp {
	Hot,
	Medium,
	Cold
}

function* onMessage(message : SlackMessage & context.Response) : Iterator<Promise<Response>> {


	const people_involved 	= message.context.messages.map(m => m.user.name);
	const uniques 			= people_involved.filter((p, i) => people_involved.indexOf(p) == i);
	const links 			= message.context.messages.filter(m => m.text.search(/http/gi) > -1);

	const merged_messages = message.context.messages.reduce((agg : SlackMessage[], curr : SlackMessage, idx : number) => {
		if(agg.length == 0)
			return [curr];
		
		const prev = agg[agg.length - 1];

		if(prev.user.name == curr.user.name) {
			let merged = Object.assign({}, prev);
			merged.text += '. ' + curr.text;

			return [...agg.slice(0, agg.length - 1), merged]
		}

		return [...agg, curr];

	}, [] as SlackMessage[])

	let messageRatio = {};

	for(let u of uniques) {
		const num_messages = merged_messages.filter(m => m.user.name == u).length;
		messageRatio[u] = num_messages/merged_messages.length;
	}

	console.log(messageRatio)

	return { 
		temperature: {
			raw_temperature: uniques.length * merged_messages.length,
			temperature: Temp.Hot
		}
	};

}

const mod : MinionModule = {
	onMessage,
	key: 'temperature',
	requirements: ['context']
}


export default mod;