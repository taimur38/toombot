const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const graph = message => {

	return Promise.all([
		companize(message),
		linkize(message)
	])
}

const companize = message => {
	const session = driver.session();

	if(message.companies.length == 0)
		return Promise.resolve(false);

	const tx = session.beginTransaction();

	for(let i = 0; i < message.companies.length; i++) {
		const company = message.companies[i];
		tx.run(`
			MERGE (m:Message {id: {m_id} })
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
		}).catch(err => console.error(err))
	}

	return tx.commit().then(res => console.log(res));
}

const linkize = message => {
	const session = driver.session();

	if(message.links.length == 0)
		return Promise.resolve(false);

	const tx = session.beginTransaction();

	for(let link of message.links) {
		tx.run(`
			MERGE (m:Message {id: {m_id} })
			MERGE (l:Link {id: {l_url}})
			MERGE (m)-[r:CONTAINS_LINK]->(l)
		`, {
			m_id: message.id,
			l_url: link.url
		})
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
			}).catch(err => console.log(err))
		}
	}

	return tx.commit()
}
module.exports = {
	graph
}
