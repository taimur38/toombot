const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const addReaction = (reaction : any) : Promise<void> => {
	const session = driver.session();
	if(reaction.item.ts == undefined) {
		console.log('no reaction ts', reaction.item)
		return Promise.resolve();
	}

	return session.run(`
		MATCH (u:User {id: {u_id}})
		MATCH (m:Message { timestamp: {m_ts} })
		MERGE (u)-[r:REACTED { type: {r_type}, timestamp: {r_ts} }]->(m)
	`, {
		u_id: reaction.user.id,
		m_ts: reaction.item.ts,
		r_type: reaction.reaction,
		r_ts: reaction.event_ts
	})
	.then(() => console.log(`saved reaction from ${reaction.user.name}`))
	.catch((err : Error) => console.error('reaction save error', err))
	.then(() => session.close())
}

const removeReaction = (reaction : any) : Promise<void> => {
	const session = driver.session();
	if(reaction.item.ts == undefined) {
		console.log('no reaction ts', reaction.item)
		return Promise.resolve();
	}

	return session.run(`MATCH (u:User {id: {u_id} })-[r:REACTED {type: {r_type} }]->(m:Message { timestamp: {m_ts} }) DELETE r`, {
		u_id: reaction.user.id,
		r_type: reaction.reaction,
		m_ts: reaction.item.ts
	})
	.then(() => console.log(`removed reaction from ${reaction.user.name}`))
	.catch((err : Error) => console.error('reaction save error', err))
	.then(() => session.close())
}

export default {
	add: addReaction,
	remove: removeReaction
}
