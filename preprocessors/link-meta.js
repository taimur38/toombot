import axios from 'axios';
import { DOMParser } from 'xmldom'
import xpath from 'xpath';

const parser = new DOMParser({
	errorHandler: {
		warning: () => {}
	}
});

export const key = 'link_meta'
export const requirements = ['links']

export async function Process(message) {

	if(message.links.length == 0)
		return { [key]: [] };

	let link_metas = [];

	for(let i = 0; i < message.links.length; i++) {
		const link = message.links[i];

		const res = await axios.get(link.url);
		const xml = parser.parseFromString(res.data);
		const ogtags = xpath.select('//meta[contains(@property, "og:")]', xml)
		const formatted = ogtags.map(tag => ({
			tag: tag.attributes[0].value,
			value: tag.attributes[1].value
		}))

		link_metas.push({
			link,
			meta: formatted
		})
	}

	return {
		[key]: link_metas
	}

}
