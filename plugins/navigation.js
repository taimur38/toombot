const axios = require('axios');
const auth = require('../constants');

function* onMessage(message) {

	let resp = /directions|navigate from (.*) to (.*)/ig.exec(message.text);

	if(!resp || resp.length !== 3)
		return;

	let origin = resp[1];
	let destination = resp[2];

	console.log(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURI(origin)}&destination=${encodeURI(destination)}&key=${auth.googleApiKey}`);

	return axios.get(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURI(origin)}&destination=${encodeURI(destination)}&key=${auth.googleApiKey}`)
		.then(res => {
			if(res && res.data && res.data.routes && res.data.routes.length > 0) {
				let temp = res.data.routes[0].legs[0];
				let directions = `Start Address: *${temp.start_address}*\nEnd Address: *${temp.end_address}*\nDistance: *${temp.distance.text}*\nTime: *${temp.duration.text}*\n\nDirections:`;

				for(let step of temp.steps) {
					directions += `\n${step.html_instructions} (*${step.distance.text}*)`.split('<b>').join('*').split('</b>').join('*')
				}

				directions += `\n\nMap: http://maps.googleapis.com/maps/api/staticmap?path=enc:${res.data.routes[0].overview_polyline.points}&size=400x400`

				return directions;
			} else {
				return;
			}
		})
		.catch(err => { console.log(err); return; })
}

module.exports = {
	onMessage,
	key: msg => 'navigation'
}
