## Toombot

This project provides a framework for building chatbots on slack, using Watson to enable advanced features.

to run, clone this repo, `npm install`, `npm run build` and `npm start`

you will need to set the `SLACK_TOKEN` environment variable, as well as environment variables for everything in `config.js`.


### Intro

Toombot is currently comprised of 3 components - many actors called minions, a core scheduler that manages these minions, and a knowledge graph that retains a model of the world.

At a high level, a minion takes slack messages as input and outputs either responses to those messages in chat, or outputs an enrichment to the message. An enrichment is anything that could be useful in analyzing and acting on a message later. A few example enrichments: the results of alchemy language on the message text, the past 5 minutes of text, an array of all urls mentioned in the message, meta-data on those urls, etc. Other minions can then accept these enrichments as inputs. In this way, we build a powerful ecosystem of minions over time that make it easier and easier to build advanced features into your chatbot.

![schema](https://github.com/taimur38/toombot/blob/master/misc/flow.png?raw=true)

A minion can require the outputs of other minons, and instead of being passed a regular slack message it will be passed the result of all those enrichments on the slack message. The core scheduler will make sure the minions are run in the right order, and will combine the outputs of the requirements to deliver the correct payload to your minion. It will also handle passing responses up the chain to be sent back to slack if desired.

Minions are implemented as generators that yield promises. This gives you an easy conversational interface and keeps the state of your interactions inside of a single function closure. For example: 
```javascript
function* onMessage(message : SlackMessage) : Iterator<Promise<MinonResponse>> {
	if(message.search(/hello/gi) == -1) {
		return Promise.resolve({
			text: "didnt say hello",
			send: true
		})
	}
	
	const response : SlackMessage = yield Promise.resolve({ text: "Hi, what is your name?", send: true });
	
	const name = response.text;
	
	return Promise.resolve({
		text: `Hello, ${name}`,
		send: true
	})
}
```

Here, you first see if the message said hello and if it doesnt you return "didn't say hello". Otherwise, you `yield` "hi what's your name" and assume that ther person will just respond with their name. You then use that information to say hello to them. Notice that the result of `yield` is a SlackMessage - this will wait until someone responds and then continue down the rest of your code. In addition, you can add a `requirements` field to your yielded result and get passed enriched messages. A good example is in `minions/hello.ts`. There is also a concept of context - since a minion can live for a long time, you generally want to respond to messages from the same channel. Maybe you want to respond to messages from the same channel and user - whatever it is, it's accomplished by supplying a `contextMatch` function in your yielded response which is given a SlackMessage as input and returns a boolean. If not supplied, it will automatically assume same channel.

There are several minions that take various inputs and write to a knowledge graph, powered by neo4j. Neo4j is always accessible to any of the minions, and as people talk over time a rich model of each of the participants in the slack emerges. Currently each message is logged, as well as all of the alchemy language features of that message, links that are shared, and metadata on those links from OG tags. Most interestingly, messages that are in the form "I think that ...." and "Barack Obama is ...." are logged, and start to give an idea about the mental models of other people in the slack.

### Technical
A minion is a module with a ```{key: string, onMessage: fn, filter: fn, requirements: []}```. The most important component of a minion is the onMessage generator function, which has to return promises. 

The example to look at to get started with minions is `minions/hello.ts`. Important base type definitions are in `types.d.ts`. 


### Services used 
- Alchemy Language
- Relationship Extraction
- Tone Analyzer
- Google Maps
- WolframAlpha
- Natural Language Classifier
- Genius
