import * as links from './links'
import { getAllTheThings } from '../lib/alchemy';

function* onMessage(message : SlackMessage & links.Response) : Iterator<Promise<Response>> {

	if(message.links.length == 0)
		return;
	
	if(message.links[0].url.search(/twitter|soundcloud|youtu|imgur|gif|jpg|png/gi) > -1)
		return;
	
	return getAllTheThings(message.links[0].url, 'url', false)
		.then(resp => {
			const assertions = resp.relations
				.filter(r => r.action.lemmatized.indexOf("be") > -1 || r.action.lemmatized.indexOf("think") > -1)
				.map(r => r.sentence)
				.filter((sentence, idx, all) => all.findIndex(x => x == sentence) == idx)
			
			if(assertions.length > 2) {
				return {
					text: assertions.map(s => "• " + s).join('\n'),
					send: true,
					threadReply: true
				}
			}
		})
		.catch(err => console.error("link analyze", err))

}

const mod : MinionModule = {
	onMessage,
	key: 'link_analyze',
	requirements: ['links']
}

export default mod;
