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
	.map(x => { console.log(x); return x; })


processed.flatMap(message => Rx.Observable.fromPromise(Promise.all(plugins.map(p => p(message)))))
	.flatMap(r => { console.log(r); return r; })
	.filter(r => r && r.content)
	.subscribe(r => {
		rtm.sendMessage(r.content, r.channel)
	})
