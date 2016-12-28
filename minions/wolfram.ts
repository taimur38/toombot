import * as axios from 'axios';

const dom = require('xmldom').DOMParser;
const xpath = require('xpath');

import { wolframAppID } from '../constants'
import { SlackMessage, MinionResult, MinionModule } from '../types'
import * as isQuestion from './isQuestion'

const parser = new dom();

function* onMessage(message : SlackMessage & isQuestion.Response) : Iterator<Promise<MinionResult>> {

	if(!message.isQuestion)
		return Promise.resolve(undefined);

	const query = message.text;
	return axios.get(`http://api.wolframalpha.com/v2/query?appid=${wolframAppID}&input=${query}&format=plaintext`)
		.then(res => {
			const xml = parser.parseFromString(res.data);
			const pods = xpath.select('//pod[contains(@title, "Result")]/subpod/plaintext', xml)
			if(pods.length == 0)
				return false;

			return { text: pods[0].firstChild.data, send: true };
		})
		.catch(err => { console.log(err); return false; })

}

const mod : MinionModule = {
	onMessage,
	key: 'wolfram',
	requirements: ['isQuestion']
}

export default mod;