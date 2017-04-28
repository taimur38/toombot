import * as context from './context';

export interface Response {
	temperature: {
		raw_temperature: number,
		temperature: Temp,
		just_transitioned: boolean
	}
}

export enum Temp {
	Hot,
	Medium,
	Cold
}

function calculateTemperature(messages : SlackMessage[]) : number {

	const people_involved 	= messages.map(m => m.user.name);
	const uniques 			= people_involved.filter((p, i) => people_involved.indexOf(p) == i);
	const links 			= messages.filter(m => m.text.search(/http/gi) > -1);

	const merged_messages = messages.reduce((agg : SlackMessage[], curr : SlackMessage, idx : number) => {
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

	const raw_temperature = uniques.length * merged_messages.length;

	return raw_temperature;
}

function getTempBucket(raw_temperature : number) : Temp {

	let temperature = Temp.Cold;
	if(raw_temperature > 50)
		temperature = Temp.Medium;
	
	if(raw_temperature > 125)
		temperature = Temp.Hot;
	
	return temperature;
}

function* onMessage(message : SlackMessage & context.Response) : Iterator<Promise<Response>> {

	const raw_temperature = calculateTemperature(message.context.messages);
	const prev_raw_temperature = calculateTemperature(message.context.messages.slice(0, message.context.messages.length - 1));

	const temperature = getTempBucket(raw_temperature);
	const prev_temp = getTempBucket(prev_raw_temperature);

	console.log(raw_temperature, prev_raw_temperature);

	return { 
		temperature: {
			raw_temperature,
			temperature,
			just_transitioned: prev_temp !== temperature
		}
	};

}

const mod : MinionModule = {
	onMessage,
	key: 'temperature',
	requirements: ['context']
}


export default mod;