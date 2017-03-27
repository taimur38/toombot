const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const toombatize = require('./toombatize');

const graph = (message : any) => {
	return Promise.all([
		companize(message),
		linkize(message),
		annotate(message),
		mentionize(message),
		factize(message)
	])
	.catch(err => {
		console.error('promise all error in meta', err)
	})
}

async function factize(message : any) {

	if(!message.alchemy || message.alchemy.relations.length == 0)
		return false;

	const session = driver.session();

	const facts = message.alchemy.relations
		.filter((m : any) => m.action && (m.action.lemmatized == 'be' || m.action.lemmatized == 'think') && m.subject && m.object);

	const promises = [];
	for(let fact of facts) {
		const text = `${fact.subject.text} ${fact.action.text} ${fact.object.text}`;
		try {
			await session.run(`
				MATCH (m:Message {id: {m_id} })
				MERGE (f:Fact {id: {f_id} })
					SET f.subject = {f_subject}, f.action = {f_action}, f.object = {f_object}
				MERGE (m)-[r:HAS_FACT]->(f)
			`, {
				m_id: message.id,
				f_id: text,
				f_subject: fact.subject.text,
				f_action: fact.action.text,
				f_object: fact.object.text
			})
		} catch(e) {
			console.error('error logging fact for message', e);
			continue;
		}

		const keywords = [...(fact.subject.keywords || []), ...(fact.object.keywords || [])];
		for(let kw of keywords) {
			try {
				await session.run(`
					MATCH (f:Fact {id: {f_id} })
					MERGE (k:Keyword {id: {k_id}, types: {k_type} })

					MERGE (f)-[r:HAS_KEYWORD {score: {k_score} }]->(k)
				`, {
					f_id: text,
					k_id: kw.text,
					k_type: kw.knowledgeGraph ? kw.knowledgeGraph.typeHierarchy : '',
					k_score: kw.relevance || 1
				})
			} catch(e) {
				console.error('error storing keyword for fact:', e);
			}
		}

		const entities = [...(fact.subject.entities || []), ...(fact.object.entities || [])];
		for(let e of entities) {
			try {
				await session.run(`
					MATCH (f:Fact {id: {f_id} })
					MERGE (e:Entity {id: {e_id}, types: {e_type} })
					MERGE (f)-[r:HAS_ENTITY {score: {e_score} }]->(e)
				`, {
					f_id: text,
					e_id: e.text,
					e_type: e.knowledgeGraph ? e.knowledgeGraph.typeHierarchy : '',
					e_score: e.relevance || 1
				})
			} catch(e) {
				console.error('error storing entitiy for fact:', e);
			}
		}
	}

	console.log('logged all facts');
	return true;
}

async function annotate(message : any) {
	const session = driver.session()
	const transactions = toombatize.annotate(message, "Message");

	for(let trans of transactions) {
		try {
			await session.run(trans)
		} catch(e) {
			console.error('toombatize error', e);
		}
	}

	session.close();
	return true;
}

const mentionize = (message : any) : Promise<void> => {

	if(message.mentions == undefined || message.mentions.length == 0) {
		return Promise.resolve();
	}

	const session = driver.session();
	const tx = session.beginTransaction();

	for(let i = 0; i < message.mentions.length; i++) {
		const mention = message.mentions[0];
		if(!mention || !mention.id)
			continue;
		tx.run(`
			MATCH (m:Message {id: {m_id} })
			MERGE (u:User {id: {u_id} })
			MERGE (m)-[r:MENTIONS_USER]->(u)
		`, {
			m_id: message.id,
			u_id: mention.id
		}).catch((err : Error) => console.error('tx run error mentionize', mention, err))
	}

	return tx.commit()
		.then(() => session.close())
		.catch((err : Error) => {
			console.error('tx commit err mentionize', message.mentions, err)
			session.close()
		})

}

const companize = (message : any) => {
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
		}).catch((err : Error) => console.error('tx run error', message.companies, err))
	}

    return tx.commit().then(() => session.close()).catch(() => session.close());
}

const linkize = (message : any) => {

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
		}).catch((err : any) => console.error('tx run error', message.links, err))
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
			}).catch((err : any) => console.error('tx run error', message.link_meta, err))
		}
	}

    return tx.commit().then(() => session.close()).catch(() => session.close())
}

export default {
	graph
};
