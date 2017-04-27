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

  try {
    await session.run(transaction)
  }
  catch(e) {
    console.error('couldnt ingest quote', e);
    return;
  }

  try {
    const things = await alchemy.getAllTheThings(message);
    const transactions = toombatize.annotate({alchemy: things, id }, "Quote");

    for(let trans of transactions) {
      try {
        await session.run(trans)
      } catch(e) {
        console.error('error running statement', e);
      }
    }
  } catch(e) {
    console.error('error getting alchemy', e)
  }

  return true;
}

const whitelist = /hemmingway|nietzsche|aesop|alan watts|albert camus|albert einstein|aldous huxley|alexander hamilton|barack obama|blaise pascal|bob dylan|bob marley|buddha|bruce lee|carl sagan|che guevara|woody allen|winston churchill|warren buffett|walt disney|walt whitman|vincent van gogh|tupac shakur|steve jobs|sun tzu|steve ballmer|stephen hawking|steve irwin|socrates|soren kierkegaard|sophocles|sigmund freud|salvador dali|roald dahl|rene descartes|ram dass|ray bradbury|ralph waldo emerson|plato|pablo picasso|orson welles|orson scott card|orson scott card|niccolo machiavelli|nelson mandela|neil gaiman|napoleon bonaparte|muhammad ali|muhammad ali jinnah|muhammad iqbal|mitch hedberg|mohsin hamid|milton friedman|mike tyson|michelangelo|michel de montaigne|martin luther king|martin luther|mark twain|marcel proust|malcolm x|mahatma gandhi|leonardo da vinci|leo tolstoy|lao tzu|kurt vonnegut|kurt cobain|karl marx|julius caesar|john steinbeck|john locke|kennedy|eisenhower|rockefeller|goethe|jimi hendrix|jesus christ|sartre|tolkien|isaac newton|isaac asimov|kant|thoreau|george washington|bush|orwell|patton|cantor|galileo|dostoevsky|nietzsche|franz kafka|rouchefoucald|scott fitzgerald|ernest hemingway|cantona|epicurus|enzo ferrari|eminem|edgar allan poe|cummings|seuss|douglas adams|donald trump|david lynch|dante alighieri|dalai lama|confucius/gi

async function parse() {
  fs.readFile('./ingest/author-quote.txt', 'utf8', async function (err,data) {
    if (err) {0
      return console.log(err);
    }
    let quotes = data.split("\n");
    for(let quote of quotes) {
      const [author, text] = quote.split("\t");

      if(author && author.search(whitelist) > -1) {
        console.log(`ingesting ${author}`)
        await annotate(text, author);
      }

    }
  });
}

parse();
