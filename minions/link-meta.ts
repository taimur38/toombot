import * as axios from 'axios';
import { DOMParser } from 'xmldom'
import * as xpath from 'xpath';
import { SlackMessage, MinionModule } from '../types'
import * as links from './links'

const parser = new DOMParser({
	errorHandler: {
		warning: () => {}
	}
});

const key = 'link_meta'

interface FormattedTags {
	type: string,
	label: string
}

export interface Response {
	link_meta: { link: links.Link, meta: FormattedTags[] }[]
}

function* onMessage(message : SlackMessage & links.Response) : Iterator<Promise<Response>> {

	if(message.links.length == 0)
		return Promise.resolve({ [key]: [] })

	let link_metas = [];

	const requestPromises = message.links.map(link => axios.get(link.url)
		.then(res => ({ res, link }))
		.catch(err => {
			console.error('couldnt get link', link, err);
			return {
				link
			}
		})
		.then(obj => ({
			success: (<any>obj).res == undefined,
			link: obj.link,
			res: (<any>obj).res as axios.Response,
		}))
	);

	return Promise.all(requestPromises)
		.then(results => results.map(({ success, res, link }) => {

			if(success){
				return {
					link,
					meta: []
				}
			};

			try {

				const xml = parser.parseFromString(res.data as string);
				const ogtags = xpath.select('//meta[contains(@property, "og:")]', xml)
				const formatted = ogtags.map((tag : any) => ({
					type: tag.attributes[0].value,
					label: tag.attributes[1].value
				}));

				return {
					link,
					meta: formatted
				}
			} catch(e) {
				console.error('error parsing link', link, e)
				return {
					link,
					meta: []
				}
			}
		})
	)
}

const mod : MinionModule = {
	onMessage,
	key: (msg : SlackMessage) => 'link_meta',
	requirements: ['links']
}

export default mod;
