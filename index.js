const RtmClient = require('@slack/client').RtmClient;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
const MemoryDataStore = require('@slack/client').MemoryDataStore;
const Rx = require('rx');

const cogenv = require('cogenv-lib');

const preprocessor = require('./preprocessors');
const plugins = require('./plugins');

const token = process.env.SLACK_TOKEN;

const rtm = new RtmClient(token, {
	dataStore: new MemoryDataStore({})
});

rtm.start();

const cogEnvConfig = {
	exchange: 'globe',
	exchangeType: 'topic',
	source: "toombot",
	host: 'amqp://watson:watsonpass@austin.watson-proto.blue'
};

const room = new cogenv(cogEnvConfig);

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

const message_source = Rx.Observable.create(observer => {
	rtm.on(RTM_EVENTS.MESSAGE, message => observer.onNext(message));
});

const processed = message_source
	.filter(message => message.type == 'message' && !message.subtype)
	.map(slackClean)
	.filter(message => message.user.name != 'toombot')
	.flatMap(message => Rx.Observable.fromPromise(preprocessor(message)))
	.map(x => { console.log(x); return x; })
	.tap(message => {
		if(message.channel.name != 'area51')
			return;

		if(message.links) {
			for(let i = 0; i < message.links.length; i++)
				room.broadcast("passive.display", [{ url: message.links[i].url}] )
		}
	})


processed.flatMap(message => Rx.Observable.fromPromise(Promise.all(plugins.map(p => p(message)))))
	.flatMap(r => { console.log(r); return r; })
	.filter(r => r && r.content)
	.subscribe(r => {
		rtm.sendMessage(r.content, r.channel)
	})
