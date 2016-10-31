const annotate = (message : any) => [
	...conceptize("Message", message.id, message.alchemy.concepts),
	...entitize("Message", message.id, message.alchemy.entities),
	...keywordize("Message", message.id, message.alchemy.keywords),
	...taxonimize("Message", message.id, message.alchemy.taxonomy),
	...emotionalize("Message", message.id, message.alchemy.emotions)
];

const emotionalize = (nodeType : string, nodeId : string, emotions : Object) => {
	let transactions = [];

	for(let emotion in emotions) {
		let score = emotions[emotion];

		transactions.push(`
			MATCH (n:${nodeType} {id: "${nodeId}"})
			MERGE (e:Emotion {id: "${emotion}"})
			MERGE (n)-[:HAS_EMOTION {score: ${score} }]->(e)
		`)
	}

	return transactions;
}

const conceptize = (nodeType : string, nodeId : string, concepts : any[]) => {
	let transactions : string[] = [];
	for(let concept of concepts) {
		if (parseFloat(concept.relevance) < 0.01 ) {
			continue;
		}
		transactions.push(`
			MATCH (n:${nodeType} {id: "${nodeId}"})
			MERGE (c:Concept {id: "${concept.text}", types: "${concept.knowledgeGraph ? concept.knowledgeGraph.typeHierarchy : ''}"})
			ON CREATE SET
				c.website = "${concept.website || ''}",
				c.geo = "${concept.geo || ''}",
				c.dbpedia = "${concept.dbpedia || ''}",
				c.yago = "${concept.yago || ''}",
				c.opencyc = "${concept.opencyc || ''}",
				c.freebase = "${concept.freebase || ''}",
				c.ciaFactbook = "${concept.ciaFactbook || ''}",
				c.census = "${concept.census || ''}",
				c.geonames = "${concept.geonames || ''}",
				c.musicBrainz = "${concept.musicBrainz || ''}",
				c.crunchbase = "${concept.crunchbase || ''}"
			MERGE (n)-[r:HAS_CONCEPT {score: ${concept.relevance} }]->(c)`);

		if(concept.knowledgeGraph === undefined)
			continue;

		let types = concept.knowledgeGraph.typeHierarchy.split('/').slice(1);
		transactions = transactions.concat(knowledgeGraphize('Concept', concept.text, types))
	}

	return transactions;
}

const entitize = (nodeType : string, nodeId : string, entities : any[]) => {

	let transactions : any[] = [];
	for(let entity of entities) {
		let disambiguated = entity.disambiguated || {};
		if (parseFloat(entity.relevance) < 0.01) {
			continue;
		}
		transactions.push(`
			MATCH (n:${nodeType} {id: "${nodeId}"})
			MERGE (e:Entity {id: "${entity.text}", types: "${entity.knowledgeGraph ? entity.knowledgeGraph.typeHierarchy : ''}"})
			ON CREATE SET
				e.website = "${disambiguated.website || ''}",
				e.geo = "${disambiguated.geo || ''}",
				e.dbpedia = "${disambiguated.dbpedia || ''}",
				e.yago = "${disambiguated.yago || ''}",
				e.opencyc = "${disambiguated.opencyc || ''}",
				e.freebase = "${disambiguated.freebase || ''}",
				e.ciaFactbook = "${disambiguated.ciaFactbook || ''}",
				e.census = "${disambiguated.census || ''}",
				e.geonames = "${disambiguated.geonames || ''}",
				e.musicBrainz = "${disambiguated.musicBrainz || ''}",
				e.crunchbase = "${disambiguated.crunchbase || ''}"
			MERGE (n)-[r:HAS_ENTITY {
					score: ${entity.relevance},
					sentiment: ${entity.sentiment ? entity.sentiment.score || 0 : 0}
			}]->(e)`)

		if(entity.knowledgeGraph === undefined)
			continue

		let types = entity.knowledgeGraph.typeHierarchy.split('/').slice(1)
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
