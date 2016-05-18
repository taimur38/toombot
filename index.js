const RtmClient = require('@slack/client').RtmClient;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
const MemoryDataStore = require('@slack/client').MemoryDataStore;

const preprocessors = require('./preprocessors');
const plugins = require('./plugins');

const token = process.env.SLACK_TOKEN;

let users = {};

var rtm = new RtmClient(token, {
	dataStore: new MemoryDataStore({})
});

rtm.start();

rtm.on(RTM_CLIENT_EVENTS.AUTHENTICATED, rtmStartData => {
})

let prev = Date.now();
rtm.on(RTM_EVENTS.USER_TYPING, e => {
	let curr = Date.now();
	console.log(e)
	console.log(curr - prev) // seems to be if you dont get another notif in 5 seconds, they are no longer typing.
	prev = curr;
});


rtm.on(RTM_EVENTS.MESSAGE, message => {

	if(message.type !== 'message' || message.subtype)
		return;

	// some dumb "enrichments"
	message.user = rtm.dataStore.getUserById(message.user);
	message.ts = new Date(parseFloat(message.ts) * 1000);


	Promise.all(preprocessors.map(processor => processor(message)))
		.then(resulting => resulting.reduce((m1, m2) => Object.assign({}, m1, m2)))
		.then(message => { console.log(message); return message; })
		.then(message => {
			let promises = [];
			for(let fn of plugins) {
				promises.push(fn(plugins))
			}

			return Promise.all(promises)
		})
		.then(responses => responses.filter(r => r)) // if it fails, dont throw error
		.then(responses => {
			//TODO: combine in intelligent way.
			for(let r of responses) {
				rtm.sendMessage(response, message.channel)
			}
		})


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
})
