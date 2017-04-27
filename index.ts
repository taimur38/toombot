const { RtmClient, WebClient, RTM_EVENTS, RTM_CLIENT_EVENTS, MemoryDataStore } = require('@slack/client');
import * as uuid from 'node-uuid'
import { EventEmitter } from 'events'

import graph from './graph';
//import * as minions from './minions';
import * as minions from './minions/tree-sched';

// import nlc from './lib/nlc';

const token = process.env.SLACK_TOKEN;

const rtm = new RtmClient(token, {
	dataStore: new MemoryDataStore({})
});

const web = new WebClient(token);

rtm.start();

const slackClean = (message : any) : SlackMessage => {

	let mentions : Array<SlackUser> = [];
	if(message.text) {
		const ats = message.text.match(/@([^<>]+)/g);
		mentions = ats && ats.length > 0 && ats.map((uid : any) => rtm.dataStore.getUserById(uid.slice(1))).filter((r : any) => r);
		mentions = mentions || [];
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
	if(cleaned.channel === undefined) {
		console.log('channel undefined')
		return;
	}
	console.log('text', cleaned.text, 'channel', cleaned.channel.name)

	if(message.user.name != 'toombot')
		minions.dispatch(myEmitter, cleaned)
})

myEmitter.on('send', async function(response : any, message : SlackMessage) {

	if(message.user.name == 'toombot') {
		return;
	}

	if(response.emoji)
		return emojiReply(response.emoji, message).catch(err => console.log(err));

	try {

		const repostTimeout = new Promise((resolve, reject) => setTimeout(resolve, 5000));
		const isRepost = await Promise.race([graph.isRepost({ response: response.text, message }), repostTimeout]);

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

	let slackResponse : SlackResponse;
	if(response.channelOverride)
		slackResponse = await sendMessage(response.text, { channel: { id: response.channelOverride }})
	else if(response.threadReply || message.thread_ts)
		slackResponse = await threadReply(response.text, message);
	else
		slackResponse = await sendMessage(response.text, message);

	graph.message(slackClean(slackResponse));
	// minions.dispatch(myEmitter, slackClean(slackResponse)); // analyze and graph toombot output -- output of this doesn't get sent.

});

async function sendMessage(text : string, ogMessage : { channel: { id: string }}) : Promise<SlackResponse> {

	return new Promise<SlackResponse>((resolve, reject) => {
		rtm.sendMessage(text, ogMessage.channel.id, (err : Error, msg : SlackResponse) => {
			if(err) {
				return reject(err)
			}
			resolve(msg)
		})
	})
}

async function threadReply(text: string, ogMessage : SlackMessage) : Promise<SlackResponse> {
	return rtm.send({
		text,
		channel: ogMessage.channel.id,
		thread_ts: ogMessage.thread_ts || ogMessage.ts,
		type: RTM_EVENTS.MESSAGE
	})
}

async function emojiReply(text : string, ogMessage : SlackMessage) : Promise<SlackResponse> {

	return new Promise<SlackResponse>((resolve, reject) => {
		web.reactions.add(text, {
			channel: ogMessage.channel.id,
			timestamp: ogMessage.ts,
		}, (err, data) => {
			if(err) {
				reject(err);
			}
			else {
				resolve(data as SlackResponse);
			}
		})
	});
}


rtm.on(RTM_EVENTS.REACTION_ADDED, (reaction : any) => {
	const cleaned = slackClean(reaction);
	graph.reaction.add(cleaned);
})

rtm.on(RTM_EVENTS.REACTION_REMOVED, (reaction : any) => {
	const cleaned = slackClean(reaction);
	graph.reaction.remove(reaction);
})
