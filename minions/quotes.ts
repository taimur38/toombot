import * as axios from 'axios';
import { bot } from '../constants'

import * as context from './context'
import * as alchemy from './alchemize'

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const context_threshold = 0.4;
const query_threshold = 0.4;
const msg_threshold = 0.2;

function* onMessage(message : SlackMessage & context.Response & alchemy.Response) : Iterator<Promise<MinionResult>> {

    let followUp = undefined;
    const response = yield quotes(message)
      .then((payload : any) => {
        if(payload.evidence) {
          followUp = payload.evidence;
          console.log('payload');
          return { 
            text: payload.text, 
            send: true, 
            filter: (msg : SlackMessage) => msg.text.search(/why/gi) > -1,
            contextMatch: (msg : SlackMessage) => msg.channel.id == message.channel.id
          };
        }
        else {
          return { text: payload.text, send: true };
        }
      })

    if(followUp)
      return { text: followUp, send: true };

}

async function quotes(response : SlackMessage & context.Response & alchemy.Response) : Promise<MinionResult> {

  const match = response.text.match(/quote(.+)? (for|about|regarding|with|on) (.+)/i);
  console.log("MATCH: ", match)
  let concept_merge = [...response.context.alchemy.concepts, ...response.context.alchemy.entities, ...response.context.alchemy.keywords]
    .filter(c => c.relevance > context_threshold)
    .sort((a, b) => b.relevance - a.relevance);

  if(match) {
    concept_merge = [...response.alchemy.concepts, ...response.alchemy.entities, ...response.alchemy.keywords]
      .filter(c => c.relevance > msg_threshold)
      .sort((a, b) => b.relevance - a.relevance);
  }

  if(concept_merge.length == 0) {
    return { text: 'i have no quotes', evidence: "nothing to search on"}
  }

  const concept_labels = concept_merge
    .filter(c => c.text.search(/quot/gi) < 0)
    .map(c => `"${c.text.toLowerCase()}"`);
  const session = driver.session();

  const concepts_str = `^(${concept_merge
      .filter(c => c.text.search(/quot/gi) < 0)
      .map(c => ".*" + c.text.toLowerCase().replace(/[.*]/g, "") + ".*")
      .join("|")
  })`

  const query = `
    MATCH (a:Author)--(q:Quote)-[r:HAS_CONCEPT|:HAS_ENTITY|:HAS_KEYWORD]-(c)
    WHERE toFloat(r.score) > ${query_threshold} AND toLower(c.id) =~ "${concepts_str}"
    RETURN a.id as author, q.text as quote, collect(c.id) as evidence, sum(toFloat(r.score)) as score, filter(x in collect(c) where toLower(x.id) in [${concept_labels}]) as overlap
    ORDER BY SIZE(overlap) DESC, score DESC
    LIMIT 10
  `;

  console.log(query)

  try {
    const results = await Promise.race([session.run(query), timeoutPromise(5000)]);
    if(!results) {
      return { text: `query timed out` }

    }

    const index = match ? parseInt(`${results.records.length * Math.random()}`) : 0;
    const record = results.records[index];

    if(!record)
      return { text: `i have no quotes`, evidence: `nothing matched ${concept_labels}`}

    return { text: `${record.get('quote')}\n\n*${record.get('author')}*`, evidence: `I searched on: ${concept_labels}, and I think this is an article about ${record.get('evidence')}` };

  } catch(e) {
    console.error(e)
  } finally {
    console.log('closing session')
    session.close();
  }
}

const timeoutPromise = ms => new Promise((resolve, reject) => {
  setTimeout(resolve, ms);
})

const mod : MinionModule = {
  onMessage,
	key: 'quote',
	filter: msg => msg.text.search(/quote/gi) > -1,
  requirements: ['context', 'alchemy']
}

export default mod;
