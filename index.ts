const { RtmClient, RTM_EVENTS, RTM_CLIENT_EVENTS, MemoryDataStore } = require('@slack/client');
import * as uuid from 'node-uuid'
import { EventEmitter } from 'events'

import graph from './graph';
//import * as minions from './minions';
import * as minions from './minions/tree-sched';
import { SlackMessage, SlackUser } from './types';

// import nlc from './lib/nlc';

const token = process.env.SLACK_TOKEN;

const rtm = new RtmClient(token, {
	dataStore: new MemoryDataStore({})
});

rtm.start();

const slackClean = (message : any) : SlackMessage => {

	let mentions : SlackUser;
	if(message.text) {
		const ats = message.text.match(/@([^<>]+)/g);
		mentions = ats && ats.length > 0 && ats.map((uid : any) => rtm.dataStore.getUserById(uid.slice(1))).filter((r : any) => r);
	}


	return Object.assign({}, message, {
		text: message.text,
		user: rtm.dataStore.getUserById(message.user),
		timestamp: new Date(parseFloat(message.ts) * 1000),
		mentions,
		channel:
			rtm.dataStore.getChannelById(message.channel) ||
			rtm.dataStore.getGroupById(message.channel) ||
			rtm.dataStore.getDMById(message.channel),
		id: uuid.v1()
	})
}

rtm.on(RTM_EVENTS.DISCONNECT, (err : any) => {
	console.log('disconnected', err);
	console.log('reconnecting in 3 seconds...');
	setTimeout(() => {
		console.log('reconnecting...');
		rtm.start();
	}, 3000);
})

class MyEmitter extends EventEmitter {};

const myEmitter = new MyEmitter();

rtm.on(RTM_EVENTS.MESSAGE, (message : any) => {
	if(message.type != 'message' || message.subtype) {
		return;
	}
	const cleaned = slackClean(message);
	console.log('text', cleaned.text, 'channel', cleaned.channel.name)

	if(message.user.name != 'toombot')
		minions.dispatch(myEmitter, cleaned)
})

myEmitter.on('send', async function(response : string, message : any) {

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

	/* try {
		const classification = await nlc.classify('toombot-output', response)

		console.log(classification)

	} catch(e) {
		console.error('nlc error', e)
	}
	*/

	const slackResponse = await sendMessage(response, message.channel.id);

	graph.message(slackClean(slackResponse));
	// minions.dispatch(myEmitter, slackClean(slackResponse)); // analyze and graph toombot output -- output of this doesn't get sent.
});

function sendMessage(text : string, channel_id : string) {

	return new Promise((resolve, reject) => {
		rtm.sendMessage(text, channel_id, (err : Error, msg : any) => {
			if(err) {
				return reject(err)
			}
			resolve(msg)
		})
	})
}

rtm.on(RTM_EVENTS.REACTION_ADDED, (reaction : any) => {
	const cleaned = slackClean(reaction);
	graph.reaction.add(cleaned);
})

rtm.on(RTM_EVENTS.REACTION_REMOVED, (reaction : any) => {
	const cleaned = slackClean(reaction);
	graph.reaction.remove(reaction);
})
