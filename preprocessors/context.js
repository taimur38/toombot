let contexts = {}; //key is channel, value is previous subject (subjects?)

const Process = message => {

	const relations = message.alchemy.relations;

	console.log(relations)

	if(relations.length == 0)
		return Promise.resolve();

	const relation = relations[0];

	console.log(relation)
	console.log(contexts)
	if(!relation.subject)
		return Promise.resolve();

	if(pronouns.indexOf(relation.subject.text) > -1) {
		let text = message.text.replace(relation.subject.text, contexts[message.channel.id]);
		return Promise.resolve({
			context_correction: text
		})
	}

	contexts[message.channel.id] = relation.subject.text;
	return Promise.resolve();
}

const pronouns = [
	"it",
	"that"
];

module.exports = {
	Process,
	key: 'context_correction',
	requirements: ['alchemy']
}
