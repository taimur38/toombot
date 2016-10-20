import { RtmClient, RTM_EVENTS, RTM_CLIENT_EVENTS, MemoryDataStore } from '@slack/client';
import Rx from 'rx';
import uuid from 'uuid'

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
	return {
		...message,
		user: rtm.dataStore.getUserById(message.user),
		timestamp: new Date(parseFloat(message.ts) * 1000),
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

reaction_added
	.map(slackClean)
	.subscribe(msg => { graph.reaction.add(msg); }, err => console.error('reaction error', err))

reaction_removed
	.map(slackClean)
	.subscribe(msg => { graph.reaction.remove(msg); }, err => console.error('reaction error', err))

const processed = message_source
	.filter(message => message.type == 'message' && !message.subtype)
	.tap(message => console.log(message.text))
	.map(slackClean)
	.flatMap(preprocess)
	.tap(message => graph.message(message))

const output = processed
	.filter(message => message.user.name != 'toombot')
	.flatMap(message => Promise.all(plugins(message)))
	.flatMap(r => { /*console.log(r);*/ return r; }) // flattens array
	.filter(r => r && r.response)
	.flatMap(r => graph.isRepost(r).then(isRepost => isRepost ? false : r ))
	.filter(r => r)
	.tap(r => {
		nlc.classify('toombot-output', r.response)
			.then(res => console.log(res))
			.catch(err => console.error('output nlc error', err))
	})
	.flatMap(r => {
		return new Promise((resolve, reject) => {
			rtm.sendMessage(r.response, r.message.channel.id, (err, msg) => {
				if(err) {
					return reject(err)
				}
				resolve(msg)
			})
		})
	})
	.tap(msg => console.log('output', msg))

output
	.map(slackClean)
	.flatMap(preprocess)
	.tap(graph.message)
	.subscribe(msg => {}, err => console.error('erorororor', err), () => console.log('completed'))
