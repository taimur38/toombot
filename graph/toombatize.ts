import * as NLULib from '../lib/nlu'
import * as NLU from '../minions/alchemize'

const annotate = (message : SlackMessage & NLU.Response, type: string) => [
	...conceptize(type, message.id, message.NLU.concepts),
	...entitize(type, message.id, message.NLU.entities),
	...keywordize(type, message.id, message.NLU.keywords),
	...taxonimize(type, message.id, message.NLU.categories),
	...emotionalize(type, message.id, message.NLU.emotion)
];

const emotionalize = (nodeType : string, nodeId : string, emotions : NLULib.Emotions) => {
	let transactions : string[] = [];

	for(let emotion in emotions) {
		let score = emotions[emotion] as number;

		transactions.push(`
			MATCH (n:${nodeType} {id: "${nodeId}"})
			MERGE (e:Emotion {id: "${emotion}"})
			MERGE (n)-[:HAS_EMOTION {score: ${score} }]->(e)
		`)
	}

	return transactions;
}

const conceptize = (nodeType : string, nodeId : string, concepts : NLULib.Concept[]) => {
	let transactions : string[] = [];
	for(let concept of concepts) {
		if (concept.relevance < 0.01 ) {
			continue;
		}
		transactions.push(`
			MATCH (n:${nodeType} {id: "${nodeId}"})
			MERGE (c:Concept {id: "${concept.text}" })
			ON CREATE SET
				c.dbpedia = "${concept.dbpedia_resource || ''}",
			MERGE (n)-[r:HAS_CONCEPT {score: ${concept.relevance} }]->(c)`);
	}

	return transactions;
}

//TODO: continue this
const entitize = (nodeType : string, nodeId : string, entities : NLULib.Entity[]) => {

	let transactions : any[] = [];
	for(let entity of entities) {
		if (entity.relevance < 0.01) {
			continue;
		}

		aslkdjf; // syntax error as reminder
		transactions.push(`
			MATCH (n:${nodeType} {id: "${nodeId}"})
			MERGE (e:Entity {id: "${entity.text}", type: "${entity.type}" })
			ON CREATE SET
				e.dbpedia = "${entity.disambiguation.dbpedia_resource}
			MERGE (n)-[r:HAS_ENTITY {
					score: ${entity.relevance},
					sentiment: ${entity.sentiment.score}
			}]->(e)`)

		transactions = transactions.concat(knowledgeGraphize('Entity', entity.text, types))
	}

	return transactions;
}

const keywordize = (nodeType : string, nodeId : string, keywords : any[]) => {

	let transactions : string[] = [];
	for(let keyword of keywords) {
		if (parseFloat(keyword.relevance) < 0.01) {
			continue;
		}
		transactions.push(`
			MATCH (d:${nodeType} {id: "${nodeId}"})
			MERGE (k:Keyword {id: "${keyword.text}", types: "${keyword.knowledgeGraph ? keyword.knowledgeGraph.typeHierarchy : ''}"})
			MERGE (d)-[r:HAS_KEYWORD {
				score: ${keyword.relevance},
				sentiment: ${keyword.sentiment ? keyword.sentiment.score || 0 : 0}
			}]->(k)`)

		if(keyword.knowledgeGraph === undefined)
			continue

		let types = keyword.knowledgeGraph.typeHierarchy.split('/').slice(1)
		transactions = transactions.concat(knowledgeGraphize('Keyword', keyword.text, types))
	}

	return transactions;
}

const taxonimize = (nodeType : string, nodeId : string, taxonomies : any[]) => {

	let transactions = [];
	for(let taxonomy of taxonomies) {

		let labels = taxonomy.label.split('/').slice(1)
		if(parseFloat(taxonomy.score) < 0.01) {
			continue;
		}

		transactions.push(`
			MATCH (d:${nodeType} {id: "${nodeId}"})
			MERGE (t:Taxonomy {id: "${labels[labels.length - 1]}"})
			MERGE (d)-[r:HAS_TAXONOMY {score: ${taxonomy.score}}]->(t)
			`)

		for(let i = 0; i < labels.length - 1; i++) {
			transactions.push(`
				MERGE (j:Taxonomy {id: "${labels[i + 1]}"})
				MERGE (k:Taxonomy {id: "${labels[i]}"})
				MERGE (j)-[r:IS_A]->(k)
			`)
		}
	}

	return transactions;
}

const knowledgeGraphize = (rootType : string, rootId : string, types : any[]) => {
	let transactions : string[] = [];
	transactions.push(`
		MATCH (n:${rootType} {id: "${rootId}"})
		MERGE (t:Type {id: "${types[types.length - 1]}"})
		MERGE (n)-[r:IS_A]->(t)`);

	for(let i = 1; i < types.length; i++) {
		transactions.push(`
			MERGE (k:Type {id: "${types[i- 1]}"})
			MERGE (j:Type {id: "${types[i]}"})
			MERGE (j)-[r:IS_A]->(k)`);
	}

	return transactions;
 }

export default {
	annotate,
	entitize,
	conceptize,
	taxonimize,
	keywordize
}
