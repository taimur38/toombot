import * as temperature from './temperature'
import * as context from './context'

const getListSentence = (arr : string[]) : string => {

	if(arr.length == 0) {
		return 'nothing';
	}

	if(arr.length == 1) {
		return arr[0];
	}

	const topic_sentence = arr.slice(0, arr.length - 1).join(", ") + ' and ' + arr[arr.length - 1];

	return topic_sentence;

}

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

	const topic_sentence = getListSentence(topics);

	const important_people = message.temperature.features.message_ratio.sort((a, b) => b.ratio - a.ratio).slice(0, 3).map(p => p.name);

	const important_sentence = getListSentence(important_people);

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