const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

function* onMessage(message) {

	const session = driver.session();
	const user = message.mentions[0].id;
	const alchemy = message.prevMessage.alchemy;
	if(alchemy.entities.length == 0 && alchemy.keywords.length == 0)
		return {text: 'nothing to opinionate'}

	let search = "";
	for(let word of [...alchemy.entities, ...alchemy.keywords]) {
		search = `${search}"${word.text}",`;
	}
	search = search.slice(0, -1);


	const transaction = `
		MATCH (e)<-[:HAS_ENTITY|:HAS_KEYWORD]-(f:Fact)<-[:HAS_FACT]-(m:Message)<-[:SENT_MESSAGE]-(u:User {id: '${user}'})
		WHERE e.id in [${search}]
		WITH m
		MATCH (m)-[r1:HAS_KEYWORD|:HAS_ENTITY|:HAS_CONCEPT]->(c)
		RETURN m as message, collect(distinct([c, r1.score, labels(c)])) as concepts
		`

	return session.run(transaction, {})
	.then(res => {
		session.close();

		let records = res.records;
		let max = 0;
		let max_message;

		for(let record of records) {
			let new_message = record.get("message");
			let meta = record.get("concepts");
			let alchemy = message.prevMessage.alchemy;
			let alchemized = {
				concepts: {},
				entities: {},
				keywords: {},
				taxonomy: {}
			}

			meta
				.filter(concept => concept[2][0] == "Concept")
				.forEach(concept => alchemized.concepts[concept[0].properties.id] = parseFloat(concept[1]));

			meta
				.filter(concept => concept[2][0] == "Entity")
				.forEach(concept => alchemized.entities[concept[0].properties.id] = parseFloat(concept[1]));

			meta
				.filter(concept => concept[2][0] == "Taxonomy")
				.forEach(concept => alchemized.taxonomy[concept[0].properties.id] = parseFloat(concept[1]));

			meta
				.filter(concept => concept[2][0] == "Keyword")
				.forEach(concept => alchemized.keywords[concept[0].properties.id] = parseFloat(concept[1]));

			let score = 0;
			let count = 0;
			for(let concept of alchemy.concepts) {
				if(concept.text in alchemized.concepts) {
					count += 1;
					score += (parseFloat(concept.relevance) + alchemized.concepts[concept.text]) / 2;
				}
			}

			for(let concept of alchemy.entities) {
				if(concept.text in alchemized.entities) {
					count += 1;
					score += (parseFloat(concept.relevance) + alchemized.entities[concept.text]) / 2;
				}
			}

			for(let concept of alchemy.keywords) {
				if(concept.text in alchemized.keywords) {
					count += 1;
					score += (parseFloat(concept.relevance) + alchemized.keywords[concept.text]) / 2;
				}
			}
			let final_score = count * score;

			if(final_score > max) {
				max = final_score;
				max_message = new_message.properties.text;
			}
		}

		if(max_message)
			return { text: max_message };

		return { text: 'no opinions :(' }
	})
	.catch(err => {
		session.close();
		console.log('error in response helper', err)
	})

}

module.exports = {
	onMessage,
	key: msg => 'opinion-me',
	filter: msg => msg.prevMessage && msg.prevMessage.alchemy && msg.text.indexOf('opinion for') > -1 && msg.mentions.length > 0
}
