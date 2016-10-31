export const key = 'links'
export const requirements = [];

export async function Process(message) {

	const re = /(https?.\/\/+)([^ >]+)/g;
	const found = message.text.match(re) || [];
	if(!found || found.length == 0)
		return { links: [] }

	return {
		links: found.filter(url => {
			const splits = url.split('|');
			if(splits.length == 1) {
				return true;
			}

			if(splits[0].indexOf(splits[splits.length - 1]) > -1) {
				return false;
			}
		})
		.map(l => ({
			url: l,
			domain: l.split('?')[0].split('/')[2].toLowerCase()
		}))
	}
}
