import { classify } from '../lib/visual-recognition'
import * as linkMeta from './link-meta'
import { classifier } from '../lib/visual-recognition'

export interface Response {
	imageTags: classifier[]
}

function* onMessage(message : SlackMessage & linkMeta.Response) : Iterator<Promise<Response>> {

	const links = message.link_meta;
	if(links.length == 0)
		return Promise.resolve();

	const image_link = message.link_meta[0].meta.find(m => m.type.indexOf('image') > -1);

	if(image_link == undefined)
		return Promise.resolve()

	return classify(image_link.label)
		.then(x => { console.log(x.classifiers); return x; })
		.then(things => ({ imageTags: things.classifiers }))
		.catch(err => {
			console.log("Preprocessor: " + err);
		})
}

const mod : MinionModule = {
	onMessage,
	key: 'imageTags',
	requirements: ['link_meta']
}

export default mod;
