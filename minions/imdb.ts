import * as axios from 'axios';

import { SlackMessage, MinionResult, MinionModule } from '../types'


function* onMessage(message : SlackMessage) : Iterator<Promise<MinionResult>> {

  // const config = { "headers": {
  //   "X-Mashape-Key": "",
  //   "Accept": "application/json"}};
	let query = message.text.replace('imdb ', '');

	// return axios.get(`https://community-netflix-roulette.p.mashape.com/api.php?title=${query}`, config)
  return axios.get(`http://www.omdbapi.com/?t=${query}`)
		.then(res => {
      let response = '';
      if(res.data['Plot'])
        response = "Title: " + res.data['Title'] + "\n Year: " + res.data['Year'] + "\n Genre: " + res.data['Genre'] + "\n Rating: " + res.data['imdbRating'] + "\n Plot: " + res.data['Plot']
      else
        return false;
      return { text: response, send: true };

		})
		.catch(err => { console.log(err); return false; })
}

const mod : MinionModule = {
	onMessage,
	key: 'imdb',
  filter: msg => msg.text.toLowerCase().startsWith(`imdb`)
}

export default mod;
