const RtmClient = require('@slack/client').RtmClient;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;

const preprocessors = require('./preprocessors');
const plugins = require('./plugins');

const token = process.env.SLACK_TOKEN;

var rtm = new RtmClient(token);

rtm.start();

rtm.on(RTM_EVENTS.MESSAGE, message => {
	console.log(message)
	if(message.type !== 'message' || message.subtype)
		return;

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

	for(let fn of plugins) {
		fn(message)
			.then(response => rtm.sendMessage(response, message.channel))
			.catch(err => console.log(err))
	}
})
