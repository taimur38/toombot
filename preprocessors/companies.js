const axios = require('axios');

const isCompany = concept => concept.type == 'Company' || (concept.knowledgeGraph && concept.knowledgeGraph.typeHierarchy.toLowerCase().indexOf("companies") > -1);

const key = 'companies'
//const approvedExchanges = ['NAS', 'NYQ', 'NASDAQ'];

const Process = message => {

	if(message.alchemy == undefined)
		return Promise.resolve({
			companies: []
		});

	const companies = message.alchemy.entities.filter(isCompany).map(entity => entity.text)
	const potential_symbols = message.text.split(' ').filter(word => word.toUpperCase() == word && word.length >= 2 && word.length <= 4);

	return Promise.all([...companies, ...potential_symbols].map(lookupSymbol))
		.then(results => ({ companies: results.filter(r => r) }))
}

const lookupSymbol = word => axios.get(`http://d.yimg.com/aq/autoc?query=${word}&region=US&lang=en-US`)
		.then(rsp => rsp.data.ResultSet.Result)
//		.then(results => results.filter(r => approvedExchanges.indexOf(r.exch) > -1))
		.then(nasdaqs => nasdaqs.length > 0 ? Object.assign({}, nasdaqs[0], { evidence: word }) : undefined)
		.catch(console.error)

module.exports = {
	Process,
	key,
	requirements: ['alchemy']
}
