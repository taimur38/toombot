const RtmClient = require('@slack/client').RtmClient;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
const MemoryDataStore = require('@slack/client').MemoryDataStore;
const Rx = require('rx');


const preprocessors = require('./preprocessors');
const plugins = require('./plugins');

const token = process.env.SLACK_TOKEN;

var rtm = new RtmClient(token, {
	dataStore: new MemoryDataStore({})
});

rtm.start();

rtm.on(RTM_CLIENT_EVENTS.AUTHENTICATED, rtmStartData => {
})

const message_source = Rx.Observable.create(observer => {
	rtm.on(RTM_EVENTS.MESSAGE, message => observer.onNext(message));
});

const processed = message_source
	.filter(message => message.type == 'message' && !message.subtype)
	.map(message => Object.assign({}, message, { user: rtm.dataStore.getUserById(message.user)}))
	.map(message => Object.assign({}, message, { ts: new Date(parseFloat(message.ts) * 1000) } ))
	.filter(message => message.user.name != 'toombot')
	.flatMap(message => Rx.Observable.fromPromise(Promise.all(preprocessors.map(p => p(message)))))
	.map(m => m.reduce((p, c) => Object.assign({}, p, c)))
	.map(x => {console.log(x); return x;})


processed.flatMap(message => Rx.Observable.fromPromise(Promise.all(plugins.map(p => p(message)))))
	.map(r => { console.log(r); return r; })
	.filter(r => r.content)
	//.map(responses => ({ content: responses.reduce((p, c) => p + " " + c, ""), channel: responses[0].channel }))
	.subscribe(responses => {
		responses.forEach(r => rtm.sendMessage(r.content, r.channel))
	})


// const preprocesss_pipeline = Rx.Observable.fromPromise(Promise.all(preprocessors.map(p => p(message))))
/* var sub = source.subscribe(
	e => console.log(e),
	err => console.log(err),
	() => console.log('done')
); */

/*rtm.on(RTM_EVENTS.MESSAGE, message => {

	if(message.type !== 'message' || message.subtype)
		return;

	// some dumb "enrichments"
	message.user = rtm.dataStore.getUserById(message.user);
	message.ts = new Date(parseFloat(message.ts) * 1000);
	if(message.user.name == 'toombot')
		return;


	Promise.all(preprocessors.map(processor => processor(message)))
		.then(resulting => resulting.reduce((m1, m2) => Object.assign({}, m1, m2)))
		.then(message => { console.log(message); return message; })
		.then(message => {
			let promises = [];
			for(let fn of plugins) {
				promises.push(fn(message))
			}

			return Promise.all(promises)
		})
		.then(responses => { console.log(responses); return responses; })
		.then(responses => responses.filter(r => r))
		.then(responses => {
			//TODO: combine in intelligent way.
			for(let r of responses) {
				rtm.sendMessage(r, message.channel)
			}
		})
		.catch(err => console.log(err))


	/*

	are they talking to toombot? then go through conversational pipeline

	 is the message
	 	- a question
		- a statement
		- a reaction
			- can we connect message chains together, and track when new conversations start

	 can we track 'warmth' of a channel based on message frequency (context in general)
	 build a context object with various metrics to pass forward along with 'message'
 		- warmth
	 	- conversation mode
			- story trading
			-
	what about related previous messages that are for context

	*/
//})
