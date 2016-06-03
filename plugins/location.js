const axios = require('axios')
const auth = require('../constants')

const onMessage = message => {

	if(!message.locations || message.locations.length == 0)
		return Promise.resolve(false);

	const filtered = message.locations.filter(loc => loc.relevance > .5);
	console.log(filtered);
	if(filtered.length == 0)
		return Promise.resolve(false);

	return Promise.resolve(`http://maps.googleapis.com/maps/api/staticmap?center=${encodeURI(filtered[0].text)}&size=400x400`);
}

module.exports = {
	onMessage
}
