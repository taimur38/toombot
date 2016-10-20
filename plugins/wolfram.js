const axios = require('axios');
const dom = require('xmldom').DOMParser;
const xpath = require('xpath');

const appid = require('../constants').wolframAppID;

const parser = new dom();

function* onMessage(message) {

	if(!message.isQuestion)
		return false;

	const query = message.context_correction || message.text;

	return axios.get(`http://api.wolframalpha.com/v2/query?appid=${appid}&input=${query}&format=plaintext`)
		.then(res => {
			const xml = parser.parseFromString(res.data);
			const pods = xpath.select('//pod[contains(@title, "Result")]/subpod/plaintext', xml)
			if(pods.length == 0)
				return false;

			return pods[0].firstChild.data;
		})
		.catch(err => { console.log(err); return false; })

}

module.exports = {
	onMessage,
	key: msg => 'wolfram'
}
