const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const onMessage = message => {
	const session = driver.session();

	session.run(`
		MERGE (u:User {id: {u_id} })
		ON CREATE SET
			u.name = {u_name},
			u.email = {u_email},
			u.image = {u_image}

		MERGE (m:Message {id: {m_id} })
		ON CREATE SET
			m.text = {m_text}

		MERGE (u)-[r:SENT_MESSAGE]->(m)

		MERGE (c:SlackChannel {id: {c_id} })
		ON CREATE SET
			c.name = {c_name}

		MERGE (m)-[:IN_CHANNEL]->(c)
	`, {
		u_id: message.user.id,
		u_name: message.user.name,
		u_email: message.user.profile.email,
		u_image: message.user.profile.image_original || message.user.profile.image_512,

		m_id: message.id,
		m_text: message.text,

		c_id: message.channel.id,
		c_name: message.channel.name
	})
	.then(res => console.log(res))
	.then(() => {
		
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

module.exports = {
	onMessage
}
