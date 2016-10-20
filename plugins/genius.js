const axios = require('axios');
const auth = require('../constants');

function* onMessage(message) {

	if(!message.alchemy) {
		return;
	}

	if(message.text.indexOf('play me a song') < 0)
		return;

	let entities = [...message.alchemy.entities, ...message.alchemy.concepts, ...message.alchemy.keywords].reduce((big_string, entity) => {
		let lower_entity = entity.text.toLowerCase().replace(' ', '%20');
		return parseFloat(entity.relevance) > 0.3 && big_string.indexOf(lower_entity) < 0 && lower_entity != 'song' ? `${big_string}%20${lower_entity}` : `${big_string}`;
	}, '')

	return axios.get(`https://api.genius.com/search?q=${entities}&access_token=${auth.geniusToken}`)
		.then(rsp => axios.get(`https://api.spotify.com/v1/search?q=${rsp.data.response.hits[0].result.title}&type=track`))
		.then(rsp => rsp.data.tracks.items.length > 0 ? rsp.data.tracks.items[0].external_urls.spotify : false)
		.catch(err => { console.log(err); return false })

}

module.exports = {
	onMessage,
	key: msg => 'genius'
}
