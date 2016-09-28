const { RtmClient, RTM_EVENTS, RTM_CLIENT_EVENTS, MemoryDataStore } = require('@slack/client');
const Rx = require('rx');

const preprocessor = require('./preprocessors');
const plugins = require('./plugins');

const token = process.env.SLACK_TOKEN;

const rtm = new RtmClient(token, {
	dataStore: new MemoryDataStore({})
});

rtm.start();

const slackClean = message => {
	return Object.assign({}, message, {
		user: rtm.dataStore.getUserById(message.user),
		ts: new Date(parseFloat(message.ts) * 1000),
		channel:
			rtm.dataStore.getChannelById(message.channel) ||
			rtm.dataStore.getGroupById(message.channel) ||
			rtm.dataStore.getDMById(message.channel)
	})
}

const message_source = Rx.Observable.fromEvent(rtm, RTM_EVENTS.MESSAGE)

const processed = message_source
	.filter(message => message.type == 'message' && !message.subtype)
	.map(slackClean)
	.filter(message => message.user.name != 'toombot')
	.flatMap(message => preprocessor(message))
	.tap(console.log)

processed.flatMap(message => Promise.all(plugins.map(p => p(message))))
	.flatMap(r => { console.log(r); return r; }) // flattens array
	.filter(r => r && r.content)
	.subscribe(r => {
		rtm.sendMessage(r.content, r.channel)
	})
