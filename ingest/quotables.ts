import { SlackMessage, MinionModule } from '../types';
import toombatize from '../graph/toombatize';
import * as alchemy from '../lib/alchemy';
import * as uuid from 'node-uuid'

const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))
const fs = require('fs')

async function annotate(message : string, author: string) {
	const session = driver.session();

  let id = uuid.v1();

  let transaction = `
    MERGE (q:Quote {text: "${message}", id: "${id}"})
    MERGE (a:Author {id: "${author}"})
    MERGE (q)-[:HAS_AUTHOR]->(a)
  `;

  await session.run(transaction).catch((err : Error) => console.error('quote ingest error', err));

  await alchemy.getAllTheThings(message)
		.then(things => ({ alchemy: things, id: id}))
    .then(res => {
      const tx = session.beginTransaction();
      const transactions = toombatize.annotate(res, "Quote");

      for(let trans of transactions)
        tx.run(trans).catch((err : Error) => console.error('toombatize tx run error', err));

      return tx.commit()
    		.then(() => session.close())
    		.catch(() => session.close())
    })
		.catch((err : Error) => {
			console.log("Preprocessor: " + err);
			console.log(err);
      session.close();
			return;
		})

    return;
}

async function parse() {
  fs.readFile('./ingest/author-quote.txt', 'utf8', async function (err,data) {
    if (err) {
      return console.log(err);
    }
    let quotes = data.split("\n");
    for(let quote of quotes) {
      let q = quote.split("\t");
      await annotate(q[1], q[0]);
    }
  });
}

parse();
