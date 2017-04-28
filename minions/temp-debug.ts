import * as temperature from './temperature'
import * as context from './context'

function* onMessage(message : SlackMessage & temperature.Response & context.Response) : Iterator<Promise<MinionResult>> {


	if(message.channel.is_group || message.channel.is_mpim || !message.temperature.just_transitioned) {
		return false;
	}

	let topics = [];
	if(message.temperature.temperature == temperature.Temp.Hot) {
		const entities = message.context.alchemy.entities.filter(e => e.relevance > 0.8);
		const concepts = message.context.alchemy.concepts.filter(c => c.relevance > 0.8);

		topics = entities.map(e => e.text);
		concepts
			.map(c => c.text)
			.filter(c => topics.indexOf(c) == -1)
			.forEach(c => topics.push(c));
	}

	const topic_sentence = topics.length > 0 ? topics.slice(0, topics.length - 1).join(", ") + ' and ' + topics[topics.length - 1] : '';

	const important_people = message.temperature.features.message_ratio.sort((a, b) => b.ratio - a.ratio).slice(0, 3).map(p => p.name);

	const important_sentence = important_people.slice(0, important_people.length - 1).join(", ") + ' and ' + important_people[important_people.length - 1];

	if(message.temperature.temperature == temperature.Temp.Hot)
		return {
			text: `#${message.channel.name} is heating up. It's mostly ${important_sentence} talking about ${topic_sentence}.`,
			channelOverride: 'C2E8ZNS4X',
			send: true,
			threadReply: false
		}

}

const mod : MinionModule = {
	key: 'temp_debug',
	requirements: ['temperature', 'context'],
	onMessage
}

export default mod;