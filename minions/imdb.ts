import * as axios from 'axios';

function* onMessage(message: SlackMessage): Iterator<Promise<MinionResult>> {

	let query = message.text.replace('imdb ', '');

	return axios.get(`http://www.omdbapi.com/?t=${query}`)
		.then(res => {
			let response = '';
			if (res.data['Plot'])
				response = "Title: " + res.data['Title'] + "\n Year: " + res.data['Year'] + "\n Genre: " + res.data['Genre'] + "\n Rating: " + res.data['imdbRating'] + "\n Plot: " + res.data['Plot']
			else
				return false;
			return { text: response, send: true };
		})
		.catch(err => { console.log(err); return false; })
}

const mod: MinionModule = {
	onMessage,
	key: 'imdb',
	filter: msg => msg.text.toLowerCase().startsWith(`imdb`)
}

export default mod;
