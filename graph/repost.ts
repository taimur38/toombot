const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

function isRepost(arg: { response : string, message : any }) {

	console.log(arg.response)
	if(arg.response.indexOf('http') == -1) {
		return Promise.resolve(false);
	}

	const session = driver.session();
	console.log(arg.response)
	const now = new Date();
	return session.run(`
		MATCH (m:Message)-->(c:SlackChannel { id: { channel } })
		WHERE m.text = { response } AND toFloat(m.timestamp) > { m_timestamp }
		return m
	`, {
		channel: arg.message.channel.id,
		response: arg.response,
		m_timestamp: (now.getTime() - 5 * 60 * 1000) / 1000
	})
	.then((res: any) => {
		session.close();
		return res.records.length != 0;
	})
	.catch((err : Error) => {
		console.error('repost error', err)
		session.close();
	})
}

export default isRepost;
