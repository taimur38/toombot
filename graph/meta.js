const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const toombatize = require('./toombatize');

const graph = message => {
	return Promise.all([
		companize(message),
		linkize(message),
		annotate(message),
		mentionize(message)
	])
	.catch(err => {
		console.error('promise all error in meta', err)
	})
}

const annotate = message => {
	const session = driver.session()
	const tx = session.beginTransaction();

	const transactions = toombatize(message);

	for(let trans of transactions)
		tx.run(trans).catch(err => console.error('toombatize tx run error'));

	return tx.commit()
		.then(() => session.close())
		.catch(() => session.close())
}

const mentionize = message => {

	if(message.mentions.length == 0) {
		return Promise.resolve(false);
	}

	const session = driver.session();
	const tx = session.beginTransaction();

	for(let i = 0; i < message.mentions.length; i++) {
		const mention = message.mentions[0];
		tx.run(`
			MATCH (m:Message {id: {m_id} })
			MERGE (u:User {id: {u_id} })
			MERGE (m)-[r:MENTIONS_USER]->(u)
		`, {
			m_id: message.id,
			u_id: mention.id
		}).catch(err => console.error('tx run error mentionize', mention, err))
	}

	tx.commit()
		.then(() => session.close())
		.catch(err => {
			console.error('tx commit err mentionize', mentions, err)
			session.close()
		})

}

const companize = message => {
	if(message.companies.length == 0)
		return Promise.resolve(false);

	const session = driver.session();
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
