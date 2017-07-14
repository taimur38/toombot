import { bot } from '../constants'

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

function* onMessage( message : SlackMessage ) : Iterator<Promise<MinionResult>> {
    return getPinz(message)
}

const timeoutPromise = ms => new Promise((resolve, reject) => {
  setTimeout(resolve, ms);
})

async function getPinz(msg : SlackMessage) : Promise<MinionResult> {

    const query = `
    match (u:User {id: "${msg.user.id}"})-[r:REACTED {type: "pushpin"}]->(m:Message)
    return m.text as text
    order by r.timestamp desc
    limit 5
    `

    const session = driver.session();
    try {

        const results = await Promise.race([session.run(query), timeoutPromise(5000)]);
        if(!results) {
            return { text: "query timed out" }
        }

        const response = results.records.map(r => "• " + r.get('text').replace(/<|>/g, "")).join('\n');

        return {
            text: response
        }
    }
    catch(e) {
        console.error(e);
        return {
            text: "there was an error: " + e
        }
    }
    finally {
        session.close();
    }

}

const mod : MinionModule = {
    onMessage, 
    key: 'pins',
    filter: msg => msg.text.search(/my pins/gi) > -1,
}

export default mod;