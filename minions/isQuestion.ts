import { SlackMessage, MinionModule } from '../types'

export interface Response {
	isQuestion: boolean
}

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {

	const lowered = message.text.toLowerCase();
	return Promise.resolve(
		{ isQuestion: (
			lowered.split(' ').length >= 3 && (
				lowered.startsWith("what") ||
				lowered.startsWith("how") ||
				lowered.startsWith("who") ||
				lowered.indexOf("?") >= 0
			)
		)
	});
}

const mod : MinionModule = {
	onMessage,
	key: 'isQuestion'
}

export default mod;
