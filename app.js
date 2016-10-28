import { RtmClient, RTM_EVENTS, RTM_CLIENT_EVENTS, MemoryDataStore } from '@slack/client'
import Rx from 'rx'
import uuid from 'uuid'
import EventEmitter from 'events'


import preprocess from './preprocessors';
import plugins from './plugins';
import graph from './graph';

import nlc from './lib/nlc';

const token = process.env.SLACK_TOKEN;

const rtm = new RtmClient(token, {
	dataStore: new MemoryDataStore({})
});

rtm.start();

const slackClean = message => {

	let mentions = undefined;
	if(message.text) {
		const ats = message.text.match(/@([^<>]+)/g);
		mentions = ats && ats.length > 0 && ats.map(uid => rtm.dataStore.getUserById(uid.slice(1))).filter(r => r);
	}

	return {
		...message,
		user: rtm.dataStore.getUserById(message.user),
		timestamp: new Date(parseFloat(message.ts) * 1000),
		mentions,
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

const reaction_added = Rx.Observable.fromEvent(rtm, RTM_EVENTS.REACTION_ADDED)
const reaction_removed = Rx.Observable.fromEvent(rtm, RTM_EVENTS.REACTION_REMOVED)
const message_source = Rx.Observable.fromEvent(rtm, RTM_EVENTS.MESSAGE)

class MyEmitter extends EventEmitter {};

const myEmitter = new MyEmitter();
rtm.on(RTM_EVENTS.MESSAGE, message => {
	if(message.type != 'message' || message.subtype) {
		return;
	}
	console.log(message.text)
	const cleaned = slackClean(message);

	minions.dispatch(myEmitter, message)
})

myEmitter.on('send', async function({response, message}) {

	if(message.user.name == 'toombot') {
		return;
	}

	try {
		const isRepost = await graph.isRepost({ response, message });

		if(isRepost) {
			console.log('repost', response)
			return;
		}
	} catch(e) {
		console.error('repost error', e)
	}

	try {
		const classification = await nlc.classify('toombot-output', r.response)

		console.log(classification)

	} catch(e) {
		console.error('nlc error', e)
	}

	const slackResponse = await sendMessage(response, message.channel.id);

	minions.dispatch(slackClean(slackResponse)); // analyze and graph toombot output -- output of this doesn't get sent.
});

function sendMessage(text, channel_id) {

	return new Promise((resolve, reject) => {
		rtm.sendMessage(text, channel_id, (err, msg) => {
			if(err) {
				return reject(err)
			}
			resolve(msg)
		})
	})
}

reaction_added
	.map(slackClean)
	.subscribe(msg => { graph.reaction.add(msg); }, err => console.error('reaction error', err))

reaction_removed
	.map(slackClean)
	.subscribe(msg => { graph.reaction.remove(msg); }, err => console.error('reaction error', err))
