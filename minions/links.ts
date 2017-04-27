const key = 'links'

export interface Response {
	links: Link[]
}

export interface Link {
	url: string,
	domain: string
}

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {

	const re = /(https?.\/\/+)([^ >]+)/g;
	const found = message.text.match(re) || [];
	if(!found || found.length == 0)
		return Promise.resolve({ links: [] })

	return Promise.resolve({
		links: found
			.filter(url => {
				const splits = url.split('|');
				if(splits.length == 1) {
					return true;
				}

				if(splits[0].indexOf(splits[splits.length - 1]) > -1) {
					return false;
				}
				return true;
			})
			.map(l => ({
				url: l,
				domain: l.split('?')[0].split('/')[2].toLowerCase()
			}))
			.map(x => { console.log(x); return x })
	})
}

const mod : MinionModule = {
	onMessage,
	key: 'links'
}

export default mod;
