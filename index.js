const RtmClient = require('@slack/client').RtmClient;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;

const pipeline = require('./pipeline');

const token = process.env.SLACK_TOKEN;

var rtm = new RtmClient(token);

rtm.start();

rtm.on(RTM_EVENTS.MESSAGE, message => {
	if(message.type !== 'message' || message.subtype)
		return;

	for(let fn of pipeline) {
		fn(message)
			.then(response => rtm.sendMessage(response, message.channel))
			.catch(err => console.log(err))
	}
})
