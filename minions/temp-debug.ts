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

	const people_involved 	= message.context.messages.map(m => m.user.name);
	const uniques 			= people_involved.filter((p, i) => people_involved.indexOf(p) == i);

	const topic_sentence = topics.slice(0, topics.length - 1).join(", ") + ' and ' + topics[topics.length - 1];

	if(message.temperature.temperature == temperature.Temp.Hot)
		return {
			text: `${message.channel.name} is heating up. ${uniques.length} people talking about ${topic_sentence}.`,
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