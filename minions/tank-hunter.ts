import * as axios from 'axios';
import { bot } from '../constants'

import { MinionModule, MinionResult, SlackMessage } from '../types'
import * as context from './context'

const session = axios.create({
	baseURL: process.env.TANK_URL,
	headers: {}
})

function* onMessage(message : SlackMessage ) : Iterator<Promise<MinionResult>> {

	const response = yield Promise.resolve({
		send: true,
		text: 'hi',
		threadReply: true,
		filter: (msg : SlackMessage) => msg.text.search(/apartment/gi) > -1,
		contextMatch: (msg : SlackMessage) => msg.user.id == message.user.id && msg.channel.id == message.channel.id,
		requirements: []
	});

	let all_apts = [];
	yield session.get(`/parseit`)
		.then(rsp => rsp.data)
		.then(function (results : any) : MinionResult {
			all_apts = results.allMsgs;
			return {
				send: true,
				text: 'found your apartments!',
				threadReply: true,
				filter: (msg : SlackMessage) => msg.text.search(/see/gi) > -1,
				contextMatch: (msg : SlackMessage) => msg.user.id == message.user.id && msg.channel.id == message.channel.id,
				requirements: []
			}
		}).catch(err => {return undefined;}) as Promise<MinionResult>;

		for(let apt of all_apts) {
			const response = yield Promise.resolve({
				send: true,
				text: "do you like this one?\n" + apt,
				threadReply: true,
				filter: (msg : SlackMessage) => msg.text.search(/\b(yes|no)\b/gi) > -1,
				contextMatch: (msg : SlackMessage) => msg.channel.id == message.channel.id,
				requirements: []
			});

			const trained = session.post('/train', {url: apt, label: response.text == "yes" ? "true" : "false"}).then(res => console.log)
		}

	return {text: "all done for the day!", send: true};

}

const mod : MinionModule = {
	onMessage,
	key: 'tank',
	filter: msg => msg.text.toLowerCase().startsWith(`hi ${bot.name}`)
}

export default mod;
