import { bot } from '../constants'
import * as isQuestion from './isQuestion'
import * as NLU from './alchemize'

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

function* onMessage(message: SlackMessage & isQuestion.Response & NLU.Response): Iterator<Promise<MinionResult>> {

  if (!message.isQuestion)
    return Promise.resolve(undefined);

  return getAnswer(message);
}

function getAnswer(message: SlackMessage & NLU.Response): Promise<MinionResult> {
  const session = driver.session();

  return session.run(`
		MATCH (c:SlackChannel {id: {c_id} })--(m:Message)--(f:Fact)
    WHERE (({text} CONTAINS f.subject AND {text} CONTAINS f.action) OR ({text} CONTAINS f.object AND {text} CONTAINS f.action))
		RETURN DISTINCT toLower(f.id) as id
		LIMIT 10
	`, {
      c_id: message.channel.id,
      text: message.text
    })
    .then((res: any) => {
      let record = '';
      for (let rec of res.records) {
        record = record + (rec.get('id')) + " | "
      }
      session.close();
      if (res.records.length == 0) {
        return false;
      }
      return { text: `${record}`, send: true }
    })
    .catch((err: any) => {
      session.close();
      console.error(err)
    })
}

const mod: MinionModule = {
  onMessage,
  key: 'memory',
  requirements: ['isQuestion', 'NLU'],
  filter: (msg: SlackMessage) => msg.mentions.some(x => x.name == "toombot")
}

export default mod;
