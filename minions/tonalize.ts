const tone = require('../lib/tone')

export interface Response {
	tone: any
}

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {
	return tone.annotate(message.text)
		.then((result : any) => ({ tone: result }))
		.catch((err : Error) => console.error(err))
}

const mod : MinionModule = {
	onMessage,
	key: 'tone',
	requirements: []
}

export default mod;
