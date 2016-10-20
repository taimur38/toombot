const axios = require('axios');
const dom = require('xmldom').DOMParser;
const xpath = require('xpath');

const parser = new dom();

function* onMessage(message) {

	const relevant_links = message.links.filter(x => x.domain.match(/theverge.com|recode.net/));

	if(relevant_links.length == 0) {
		return;
	}

	return axios.get(relevant_links[0].url)
		.then(rsp => {

			let response = "";

			const span = rsp.data.match(/<q+><span>(.+)<\/q>/g)
			if(span && span.length > 0) {
				for(let s of span) {
					try {
						const xml = parser.parseFromString(s);
						const test = xpath.select('/q/span', xml);
						const text = test[0].firstChild.data;
						if(text)
							response = response + `> ${text}\n`
					}
					catch(e) {
						console.log(e);
					}
				}
			}

			const nospan = rsp.data.match(/<q(.?)+>(.+)<\/q>/g)
			if(nospan && nospan.length > 0) {
				for(let n of nospan) {
					try{
						const xml = parser.parseFromString(n);
						const test = xpath.select('/q', xml);
						const text = test[0].firstChild.data;
						if(text)
							response = response + `> ${text}\n`
					}
					catch(e) {
						console.log(e)
					}
				}
			}

			return response.length > 0 ? response : false;
		})
		.catch(err => { console.log(err); return false; })

}

module.exports = {
	onMessage,
	key: msg => 'verge'
}
