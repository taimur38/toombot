import * as context from './context';

export interface Response {
	temperature: {
		raw_temperature: number,
		temperature: Temp,
		just_transitioned: boolean,
		features: {
			unique_people: string[],
			links: string[],
			message_ratio: {name: string, ratio: number}[]
		}
	}
}

export enum Temp {
	SuperLit,
	Hot,
	Medium,
	Cold
}

function calculateTemperature(messages : SlackMessage[]) {

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

	let message_ratio = uniques.map(name => ({
		ratio: merged_messages.filter(m => m.user.name == name).length / merged_messages.length,
		name
	}));

	console.log(message_ratio)

	const raw_temperature = uniques.length * merged_messages.length;

	return {
		uniques,
		links,
		merged_messages,
		message_ratio,
		raw_temperature
	};
}

function getTempBucket(raw_temperature : number) : Temp {

	let temperature = Temp.Cold;
	if(raw_temperature > 50)
		temperature = Temp.Medium;
	
	if(raw_temperature > 125)
		temperature = Temp.Hot;
	
	if(raw_temperature > 300)
		temperature = Temp.SuperLit;
	
	return temperature;
}

function* onMessage(message : SlackMessage & context.Response) : Iterator<Promise<Response>> {

	const current_features = calculateTemperature(message.context.messages);
	const prev_features = calculateTemperature(message.context.messages.slice(0, message.context.messages.length - 1));

	const temperature = getTempBucket(current_features.raw_temperature);
	const prev_temp = getTempBucket(prev_features.raw_temperature);

	console.log(current_features.raw_temperature, prev_features.raw_temperature);

	return { 
		temperature: {
			raw_temperature: current_features.raw_temperature,
			temperature,
			just_transitioned: prev_temp !== temperature,
			features: {
				unique_people: current_features.uniques,
				links: current_features.links,
				message_ratio: current_features.message_ratio
			}
		}
	};

}

const mod : MinionModule = {
	onMessage,
	key: 'temperature',
	requirements: ['context']
}


export default mod;