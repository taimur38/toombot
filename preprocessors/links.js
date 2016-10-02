export const key = 'links'
export const requirements = [];

export async function Process(message) {

	const re = /(https?.\/\/+)([^ ]+)/g;
	const found = message.text.match(re) || [];
	if(!found || found.length == 0)
		return { links: [] }

	const url = found[0].slice(0, found[0].length - 1)

	return {
		links: found.map(l => ({
			url: l.slice(0, l.length - 1),
			domain: l.split('?')[0].split('/')[2].toLowerCase()
		}))
	}
}
