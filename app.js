import { RtmClient, RTM_EVENTS, RTM_CLIENT_EVENTS, MemoryDataStore } from '@slack/client';
import Rx from 'rx';
import uuid from 'uuid'

import preprocess from './preprocessors';
import plugins from './plugins';

const token = process.env.SLACK_TOKEN;

const rtm = new RtmClient(token, {
	dataStore: new MemoryDataStore({})
});

rtm.start();

const slackClean = message => {
	return {
		...message,
		user: rtm.dataStore.getUserById(message.user),
		timestamp: new Date(parseFloat(message.timestamp) * 1000),
		channel:
			rtm.dataStore.getChannelById(message.channel) ||
			rtm.dataStore.getGroupById(message.channel) ||
			rtm.dataStore.getDMById(message.channel),
		id: uuid.v1()
	}
}

rtm.on(RTM_EVENTS.DISCONNECT, err => {
	console.log('disconnected', err);
	console.log('reconnecting in 3 seconds...');
	setTimeout(() => {
		console.log('reconnecting...');
		rtm.start();
	}, 3000);
})

const message_source = Rx.Observable.fromEvent(rtm, RTM_EVENTS.MESSAGE)

const processed = message_source
	.filter(message => message.type == 'message' && !message.subtype)
	.map(slackClean)
	.filter(message => message.user.name != 'toombot')
	.flatMap(preprocess)
	.tap(console.log)

processed.flatMap(message => Promise.all(plugins.map(p => p(message))))
	.flatMap(r => { /*console.log(r);*/ return r; }) // flattens array
	.filter(r => r && r.content)
	.subscribe(r => {
		rtm.sendMessage(r.content, r.channel)
	})
