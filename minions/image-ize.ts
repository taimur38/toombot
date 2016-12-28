import { classify } from '../lib/visual-recognition'
import * as linkMeta from './link-meta'
import { SlackMessage, MinionModule } from '../types';

interface Response {
	imageTags: any
}

function* onMessage(message : SlackMessage & linkMeta.Response) : Iterator<Promise<Response>> {

	const links = message.link_meta;
	if(links.length == 0)
		return Promise.resolve();

	const image_link = message.link_meta[0].meta.find(m => m.type.indexOf('image') > -1);
	console.log(image_link);

	if(image_link.label.match(/png|jpg|jpeg|gif/)) {
		return classify(image_link.label)
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
	requirements: ['link_meta']
}

export default mod;
