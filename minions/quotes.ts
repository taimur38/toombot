import * as axios from 'axios';
import { bot } from '../constants'

import { MinionModule, MinionResult, SlackMessage } from '../types'
import * as context from './context'
import * as alchemy from './alchemize'

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const context_threshold = 0.4;
const query_threshold = 0.4;
const msg_threshold = 0.2;

function* onMessage(message : SlackMessage & context.Response & alchemy.Response) : Iterator<Promise<MinionResult>> {
  return quotes(message);
}

async function quotes(response : SlackMessage & context.Response & alchemy.Response) : Promise<MinionResult> {


	if(response.text.search(/quote/gi) == -1) {
    console.log('doesnt have quote');
    return;
  }

  console.log(response.text);
  const match = response.text.match(/quote for (.+)/i);
  console.log("MATCH: ", match)
  let concept_merge = [...response.context.concepts, ...response.context.entities, ...response.context.keywords]
    .filter(c => c.relevance > context_threshold)
    .sort((a, b) => b.relevance - a.relevance);

  if(match) {
    concept_merge = [...response.alchemy.concepts, ...response.alchemy.entities, ...response.alchemy.keywords]
      .filter(c => c.relevance > msg_threshold)
      .sort((a, b) => b.relevance - a.relevance);
  }
  
  if(concept_merge.length == 0) {
    return { text: 'i have no quotes', send: true }
  }
  
  const concept_labels = concept_merge
    .filter(c => c.text.search(/quot/gi) < 0)
    .map(c => `"${c.text.toLowerCase()}"`);
  const session = driver.session();
  console.log(`c.id in [${concept_labels}]`);

  const query = `
    MATCH (a:Author)--(q:Quote)-[r:HAS_CONCEPT|:HAS_ENTITY|:HAS_KEYWORD]-(c)
    WHERE toFloat(r.score) > ${query_threshold} AND toLower(c.id)  in [${concept_labels}]
    RETURN a.id as author, q.text as quote, filter(x in collect(c) where toLower(x.id) in [${concept_labels}]) as overlap 
    ORDER BY SIZE(overlap) DESC 
    LIMIT 10
  `;

  console.log(query)

  try {
    const results = await session.run(query);

    const record = results.records[0];
    if(!record)
      return { text: `i have no quotes`, send: true }
    return { text: `${record.get('quote')}\n\n*${record.get('author')}*`, send: true };

  } catch(e) {
    console.error(e)
  } finally {
    console.log('closing session')
    session.close();
  }

  /*
    .then(res => {
      const record = res.records[0];
      session.close();
      if (!record) {
          return false;
      }
      return { text: `"${record.get('quote')}" - ${record.get('author')}`, send: true };
    })
    .catch(err => session.close())
    */
}

const mod : MinionModule = {
  onMessage,
	key: 'quote',
	filter: msg => msg.text.search(/quote/gi) > -1,
  requirements: ['context', 'alchemy']
}

export default mod;
