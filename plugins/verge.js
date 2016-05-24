const axios = require('axios');
const dom = require('xmldom').DOMParser;
const xpath = require('xpath');

const parser = new dom();

const onMessage = message => {

	const relevant_links = message.links.filter(x => x.domain.indexOf('theverge') > -1);

	if(relevant_links.length == 0) {
		return Promise.resolve(false);
	}

	return axios.get(relevant_links[0].url)
		.then(rsp => {

			const found = rsp.data.match(/<q .+><span>(.+)<\/q>/g)
			if(found && found.length > 0) {
				const xml = parser.parseFromString(found[0]);
				const test = xpath.select('/q/span', xml);
				return `> ${test[0].firstChild.data}`
			}
		})
		.catch(err => { console.log(err); return false; })

}

module.exports = {
	onMessage
}
