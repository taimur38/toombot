let contexts = {}; //key is channel, value is previous subject (subjects?)
const subj_thresh = 5 * 60 * 1000;
const key = 'context_correction'

const Process = message => {

	if(!message.alchemy || !message.alchemy.relations) {
		return Promise.resolve();
	}
	const relations = message.alchemy.relations;
	let prev_subject = contexts[message.channel.id] || {};

	// only care about 'recent' subjects
	if(message.ts - (prev_subject.ts || 0) > subj_thresh)
		prev_subject = {};

	let relation = {};
	if(relations.length > 0)
		relation = relations[0];

// if the subject is a pronoun, replace with prev subject
	if(relation.subject) {
		if(pronouns.indexOf(relation.subject.text) > -1)
			return Promise.resolve({
				[key]: message.text.replace(relation.subject.text, prev_subject.text)
			})
	}

// if there is a pronoun at all, replace it
	if(prev_subject.text) {
		for(let p of pronouns) {
			if(message.text.split(' ').indexOf(p) > -1) {
				return Promise.resolve({
					[key]: message.text.replace(p, prev_subject.text)
				})
			}
		}
	}

	if(!relation.subject)
		return Promise.resolve({ [key]: undefined });

	contexts[message.channel.id] = { text: relation.subject.text, ts: message.ts };
	return Promise.resolve({ [key]: undefined });
}

const pronouns = [
	"it",
	"that",
	"he",
	"she",
	"his",
	"him",
	"her"
];

module.exports = {
	Process,
	key,
	requirements: ['alchemy']
}
