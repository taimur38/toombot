const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

function* onMessage(message) {

	const session = driver.session();
	const channel = message.channel.id;
	const user = message.user.id;
	const transaction = `
		MATCH (c:SlackChannel {id: '${channel}'})<--(m: Message)<--(u1: User {id: '${user}'})
		WITH m
		MATCH (c:SlackChannel {id: '${channel}'})<--(n: Message)<--(u2: User {id: '${user}'})
		WHERE toFloat(m.timestamp) - toFloat(n.timestamp) > 0 and toFloat(m.timestamp) - toFloat(n.timestamp) < 30
		WITH m, n
		MATCH (n)-[r1:HAS_ENTITY|HAS_TAXONOMY|HAS_KEYWORD|HAS_CONCEPT]-(c)
		RETURN n as message, collect(distinct([c, r1.score, labels(c)])) as concepts
	`;

	return session.run(transaction, {})
	.then(res => {
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
			let concepts = meta.filter(concept => concept[2][0] == "Concept").forEach(concept => alchemized.concepts[concept[0].id] = concept[1]);
			let entities = meta.filter(concept => concept[2][0] == "Entity").forEach(concept => alchemized.entities[concept[0].id] = concept[1]);
			let taxonomy = meta.filter(concept => concept[2][0] == "Taxonomy").forEach(concept => alchemized.taxonomy[concept[0].id] = concept[1]);
			let keywords = meta.filter(concept => concept[2][0] == "Keyword").forEach(concept => alchemized.keywords[concept[0].id] = concept[1]);

			let score = 0;
			let count = 0;
			for(let concept of alchemy.concepts) {
				if(concept.id in alchemized.concepts) {
					count += 1;
					score += (concept.score + alchemized.concepts[concept.id]) / 2;
				}
			}

			for(let concept of alchemy.entities) {
				if(concept.id in alchemized.entities) {
					count += 1;
				}
			}

			for(let concept of alchemy.keywords) {
				if(concept.id in alchemized.keywords) {
					count += 1;
				}
			}

			if(count > max) {
				max = count;
				max_message = new_message.properties.text;
			}
		}

		if(max_message)
			return {text: max_message};
	})
	.catch(err => {
		session.close();
		console.log('error in response helper', err)
	})

}

module.exports = {
	onMessage,
	key: msg => 'help-me',
	filter: msg => msg.prevMessage && msg.prevMessage.alchemy && msg.text.indexOf('respond for') > -1
}
