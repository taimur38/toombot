const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const onMessage = message => {
	const session = driver.session();

	session.run(`
		MERGE (u:User {id: {u_id} })
		SET
			u.name = {u_name},
			u.email = {u_email},
			u.image = {u_image}

		MERGE (m:Message {id: {m_id} })
		ON CREATE SET
			m.text = {m_text},
			m.timestamp = {m_timestamp}

		MERGE (u)-[r:SENT_MESSAGE]->(m)

		MERGE (c:SlackChannel {id: {c_id} })
		ON CREATE SET
			c.name = {c_name}

		MERGE (m)-[:IN_CHANNEL]->(c)
	`, {
		u_id: message.user.id,
		u_name: message.user.name,
		u_email: message.user.profile.email || '',
		u_image: message.user.profile.image_original || message.user.profile.image_512,

		m_id: message.id,
		m_text: message.text,
		m_timestamp: message.ts,

		c_id: message.channel.id,
		c_name: message.channel.name || ''
	})
	.then(res => {
		if(message.links.length == 0)
			return;
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
	})
	.catch(err => {
		console.error('errrr', err)
	})
	.then(() => session.close())

	/*.then(res => session.run(`
		MATCH (m:Message {id: {m_id} })

		MERGE (c:AlchemyConcept {id: {c_id}})

	`)) //TODO: toombotize message */

	return Promise.resolve(false)
}

const onReaction = reaction => {
	const session = driver.session();
	console.log(reaction.user.name, reaction.item.ts, reaction.reaction, reaction.event_ts);
	session.run(`
		MATCH (u:User {id: {u_id}})
		MATCH (m:Message {timestamp: m_ts})
		MERGE (u)-[r:REACTED { type: {r_type}, timestamp: {r_ts} }]->(m)
	`, {
		u_id: reaction.user.name,
		m_ts: reaction.item.ts,
		r_type: reaction.reaction,
		r_ts: reaction.event_ts
	})
	.then(res => console.log(`saved reaction from ${reaction.user.name}`))
	.catch(err => console.error('reaction save error', err))
	.then(() => session.close())
}

module.exports = {
	message: onMessage,
	reaction: onReaction
};
