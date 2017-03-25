import { SlackMessage, MinionModule } from '../types'

export interface Response {
	isQuestion: boolean
}

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {

	return Promise.resolve(
		{ isQuestion: (
			message.text.split(' ').length >= 3 && (
				message.text.startsWith("what") ||
				message.text.startsWith("how") ||
				message.text.startsWith("who") ||
				message.text.indexOf("?") >= 0
			)
		)
	});
}

const mod : MinionModule = {
	onMessage,
	key: 'isQuestion'
}

export default mod;
