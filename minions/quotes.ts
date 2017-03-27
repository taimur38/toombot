import * as axios from 'axios';
import { bot } from '../constants'

import { MinionModule, MinionResult, SlackMessage } from '../types'
import * as context from './context'

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

function* onMessage(message : SlackMessage & context.Response) : Iterator<Promise<MinionResult>> {
  return quotes(message);
}

async function quotes(response : SlackMessage & context.Response) : Promise<MinionResult> {
	let concepts = response.context.concepts.filter(c => c.relevance > 0.4).sort((a,b) => b.relevance - a.relevance)
	let entities = response.context.entities.filter(c => c.relevance > 0.4).sort((a,b) => b.relevance - a.relevance);

  let concept_merge = [...concepts, ...entities].sort((a,b) => b.relevance - a.relevance);

  if(concept_merge.length < 1)
    return Promise.resolve({ text: 'i have no quotes', send: true })

  let concept = concept_merge[0].text;
  console.log(concept_merge[0])
  let session = driver.session();

  let transaction = `
    MATCH (a:Author)--(q:Quote)--(c)
    WHERE c.id="${concept}" and (c:Concept or c:Entity)
    RETURN a.id as author,q.text as quote
  `;

  return session.run(transaction)
    .then(res => {
      const record = res.records[0];
      session.close();
      if (!record) {
          return false;
      }
      return { text: `"${record.get('quote')}" - ${record.get('author')}`, send: true };
    })
    .catch(err => session.close())
}

const mod : MinionModule = {
	onMessage,
	key: 'quote',
	filter: msg => msg.text.toLowerCase().indexOf("quote") > -1,
  requirements: ['context']
}

export default mod;
