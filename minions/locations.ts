import * as NLU from './alchemize';

const isLoc = (concept : any) => concept.geo || (concept.knowledgeGraph && concept.knowledgeGraph.typeHierarchy.indexOf("/places/") > -1);

export interface Response {
	locations: {
		text: string,
		relevance: number
	}
}

function* onMessage(message : SlackMessage & NLU.Response) : Iterator<Promise<Response>> {

	let temp = {};

	if(message.NLU.concepts) {
		message.NLU.concepts
			.filter(isLoc)
			.forEach(concept => {
				temp[concept.text.toLowerCase()] = Math.max(temp[concept.text.toLowerCase()] || 0, concept.relevance);
			})
	}

	if(message.NLU.entities) {
		message.NLU.entities
			.filter(isLoc)
			.forEach(entity => {
				temp[entity.text.toLowerCase()] = Math.max(temp[entity.text.toLowerCase()] || 0, entity.relevance);
			});
	}

/*	if(message.alchemy.keywords) {
		message.alchemy.keywords
			.filter(isLoc)
			.forEach(keyword => {
				temp[keyword.text.toLowerCase()] = Math.max(temp[keyword.text.toLowerCase()] || 0, keyword.relevance);
			})
	}
	*/

  let locations = [];

  for (let key in temp) {
	if (temp.hasOwnProperty(key)) {
		locations.push({
			text: key,
			relevance: temp[key]
		});
	}
}

	locations.sort((a, b) => b.relevance - a.relevance);

	return Promise.resolve({
		locations: locations
	});
}

const mod : MinionModule = {
	onMessage,
	key: 'locations',
	requirements: ['NLU']
}

export default mod;
