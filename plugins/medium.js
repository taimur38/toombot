const axios = require('axios');

function* onMessage(message) {

	const links = message.links.filter(l => l.domain == "medium.com");

	if(links.length == 0)
		return false;

	const splits = links[0].url.split('/');
	const id = splits[splits.length - 1].split('#')[0];

	return axios.get(`https://medium.com/p/${id}/quotes`)
		.then(rsp => rsp.data.split("</x>")[1])
		.then(j => JSON.parse(j))
		.then(parsed => `> ${parsed.payload.value[0].paragraphs[0].text}`)
		.catch(err => { console.log(err); return false })

}

module.exports = {
	onMessage,
	key: msg => 'medium'
}
