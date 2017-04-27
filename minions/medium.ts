import * as axios from 'axios';
import * as links from './links'

function* onMessage(message : SlackMessage & links.Response) : Iterator<Promise<MinionResult>> {

	const links = message.links.filter(l => l.domain == "medium.com");
	if(links.length == 0)
		return Promise.resolve(undefined)

	const splits = links[0].url.split('/');
	const id = splits[splits.length - 1].split('#')[0];

	return axios.get(`https://medium.com/p/${id}/quotes`)
		.then(rsp => (<string>rsp.data).split("</x>")[1])
		.then(j => JSON.parse(j))
		.then(parsed => ({ text: `> ${parsed.payload.value[0].paragraphs[0].text}`, send: true }))
		.catch(err => { console.log(err); return false })

}

const mod : MinionModule = {
	onMessage,
	key: 'medium',
	requirements: ['links']
}

export default mod;