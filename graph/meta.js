const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const graph = message => {
	return Promise.all([
		companize(message),
		linkize(message),
		annotate(message)
	])
	.catch(err => {
		console.error('promise all error in meta', err)
	})
}

function annotate(message) {
	const session = driver.session();
	const tx = session.beginTransaction();

	const transactions = [
		...conceptize("Message", message.id, message.alchemy.concepts),
		...entitize("Message", message.id, message.alchemy.entities),
		...keywordize("Message", message.id, message.alchemy.keywords),
		...taxonimize("Message", message.id, message.alchemy.taxonomy),
		...emotionalize("Message", message.id, message.alchemy.emotions)
	];

	for(let trans of transactions)
		tx.run(trans).catch(err => console.error('tx run error'));

	return tx.commit().then(() => session.close());
}

const emotionalize = (nodeType, nodeId, emotions) => {
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

const conceptize = (nodeType, nodeId, concepts) => {
	let transactions = [];
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

const entitize = (nodeType, nodeId, entities) => {

	let transactions = [];
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

const keywordize = (nodeType, nodeId, keywords) => {

	let transactions = [];
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

const taxonimize = (nodeType, nodeId, taxonomies) => {

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

const knowledgeGraphize = (rootType, rootId, types) => {
	let transactions = [];
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

const companize = message => {
	const session = driver.session();
	if(message.companies.length == 0)
		return Promise.resolve(false);

	const tx = session.beginTransaction();

	for(let i = 0; i < message.companies.length; i++) {
		const company = message.companies[i];
		tx.run(`
			MATCH (m:Message {id: {m_id} })
			MERGE (c:Company {id: {c_id} })
			ON CREATE SET
				c.name = {c_name},
				c.symbol = {c_symbol},
				c.exchange = {c_exchange},
				c.type = {c_type},
				c.exchDisp = {c_exchDisp},
				c.typeDisp = {c_typeDisp},
				c.evidence = {c_evidence}

			MERGE (m)-[r:MENTIONS_COMPANY {rank: {r_rank} }]->(c)
		`, {
			m_id: message.id,
			c_id: company.symbol + '-' + company.exch,
			c_name: company.name,
			c_symbol: company.symbol,
			c_exchange: company.exch,
			c_type: company.type,
			c_exchDisp: company.exchDisp,
			c_typeDisp: company.typeDisp,
			c_evidence: company.evidence,
			r_rank: i
		}).catch(err => console.error('tx run error', message.companies, err))
	}

	return tx.commit().then(() => session.close());
}

const linkize = (message) => {

	if(message.links.length == 0)
		return Promise.resolve(false);

	const session = driver.session();
	const tx = session.beginTransaction();

	for(let link of message.links) {
		tx.run(`
			MATCH (m:Message {id: {m_id} })
			MERGE (l:Link {id: {l_url}})
			MERGE (m)-[r:CONTAINS_LINK]->(l)
		`, {
			m_id: message.id,
			l_url: link.url
		}).catch(err => console.error('tx run error', message.links, err))
	}

	for(let link_meta of message.link_meta) {
		console.log(link_meta.link.url)
		for(let tag of link_meta.meta) {
			tx.run(`
				MERGE (l:Link {id: {l_id} })
				MERGE (t:Tag {id: {t_id}})
				ON CREATE SET
					t.label = {t_label},
					t.type = {t_type}

				MERGE (l)-[r:HAS_TAG]->(t)
			`, {
				l_id: link_meta.link.url,
				t_id: tag.type + '-' + tag.label,
				t_label: tag.label,
				t_type: tag.type
			}).catch(err => console.error('tx run error', message.link_meta, err))
		}
	}

	return tx.commit().then(() => session.close())
}

module.exports = {
	graph
};
