import alchemy from '../lib/alchemy';
import * as links from './links'
import { SlackMessage, MinionModule } from '../types';

interface Response {
	imageTags: any
}

function* onMessage(message : SlackMessage & links.Response) : Iterator<Promise<Response>> {

	const links = message.links;
	if(links.length == 0)
		return Promise.resolve();

	const image_link = message.links[0].url;

	if(image_link.match(/png|jpg|jpeg|gif/)) {
		return alchemy.getImageKeywords(image_link)
			.then(things => ({ imageTags: things }))
			.catch(err => {
				console.log("Preprocessor: " + err);
			})
		}
	return Promise.resolve();
}

const mod : MinionModule = {
	onMessage,
	key: 'imageTags',
	requirements: ['links']
}

export default mod;
