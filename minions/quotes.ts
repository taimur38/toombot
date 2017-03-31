import * as axios from 'axios';
import { bot } from '../constants'

import { MinionModule, MinionResult, SlackMessage } from '../types'
import * as context from './context'

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const context_threshold = 0.4;
const query_threshold = 0.4;

function* onMessage(message : SlackMessage & context.Response) : Iterator<Promise<MinionResult>> {
  return quotes(message);
}

async function quotes(response : SlackMessage & context.Response) : Promise<MinionResult> {

  const concept_merge = [...response.context.concepts, ...response.context.entities].filter(c => c.relevance > context_threshold).sort((a, b) => b.relevance - a.relevance);

  if(concept_merge.length == 0) {
    return { text: 'i have no quotes', send: true }
  }
  
  const concept_labels = concept_merge.map(c => `"${c.text}"`);
  const session = driver.session();

  const query = `
    MATCH (a:Author)--(q:Quote)-[r:HAS_CONCEPT|:HAS_ENTITY]-(c)
    WHERE toFloat(r.score) > ${query_threshold} AND c.id  in [${concept_labels}]
    RETURN a.id as author, q.text as quote, filter(x in collect(c) where x.id IN [${concept_labels}]) as overlap 
    order by size(overlap) desc
    limit 10
  `;

  try {
    const results = await session.run(query);

    const record = results.records[0];
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
	filter: msg => msg.text.toLowerCase().indexOf("quote") > -1,
  requirements: ['context']
}

export default mod;
