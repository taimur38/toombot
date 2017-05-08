//import * as alchmemize from './alchemize';
import * as NLU from './alchemize'
import * as linkMeta from './link-meta';
import * as links from './links';
import * as companies from './companies';

import meta from '../graph/meta';

export interface Response {
	graphMeta: boolean
}

type Message = SlackMessage & NLU.Response & linkMeta.Response & companies.Response & links.Response;

function* onMessage(message : Message ) : Iterator<Promise<Response>> {

	return meta.graph(message)
		.then(() => ({ graphMeta: true }))
		.catch(err => {
			console.error('promise all error in meta', err)
			return { graphMeta: false }
		})
}

const mod : MinionModule = {
	onMessage,
	key: 'graphMeta',
	requirements: ['graphMsg', 'NLU', 'companies']
};

export default mod;
