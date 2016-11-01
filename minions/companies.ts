import * as axios from 'axios';
import { MinionModule, SlackMessage, MinionResult } from '../types';
import { AllTheThings } from '../lib/alchemy'

//const approvedExchanges = ['NAS', 'NYQ', 'NASDAQ'];
const isCompany = (concept : any) => concept.type == 'Company' || (concept.knowledgeGraph && concept.knowledgeGraph.typeHierarchy.toLowerCase().indexOf("companies") > -1);

interface Response {
	companies: any[]
}

function* onMessage(message : SlackMessage & { alchemy: AllTheThings }) : Iterator<Promise<Response>> {

	if(!message.alchemy) {
		console.log("SHIT")
		return Promise.resolve(false)
	}

	const companies = message.alchemy.entities.filter(isCompany).map((entity : any) => entity.text as string)
	const potential_symbols = message.text.split(' ').filter((word : string) => word.toUpperCase() == word && word.length >= 2 && word.length <= 4); //TODO: check numbers

	return Promise.all([...companies, ...potential_symbols].map(lookupSymbol))
		.then(results => ({ companies: results.filter(r => r) }))
		.catch(err => {
			console.error(err);
			return { companies: [] };
		})
}

const lookupSymbol = (word : string) => axios.get(`http://d.yimg.com/aq/autoc?query=${word}&region=US&lang=en-US`)
		.then(rsp => rsp.data as any)
		.then(rsp => rsp.ResultSet.Result as any[])
//		.then(results => results.filter(r => approvedExchanges.indexOf(r.exch) > -1))
		.then(nasdaqs => nasdaqs.length > 0 ? Object.assign({}, nasdaqs[0], { evidence: word }) : undefined)
		.catch(console.error)

const mod : MinionModule = {
	onMessage,
	key: (msg : SlackMessage) => 'companies',
	requirements: ['alchemy'],
	filter: (msg : SlackMessage) => true
}

export default mod;
