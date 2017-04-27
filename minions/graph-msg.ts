import graph from '../graph'

export interface Response {
	graphMsg: boolean
}

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {

	return graph.message(message)
		.then(() => {
			console.log('done graph')
			return { graphMsg: true }
		})
		.catch((err : Error) => console.error(err))
}

const mod : MinionModule = {
	onMessage,
	key: 'graphMsg'
}

export default mod;
