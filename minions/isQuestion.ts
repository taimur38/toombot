export interface Response {
	isQuestion: boolean
}

const blacklist = new RegExp("(" + [
	"what do you mean",
	"what you mean",
	"what does that mean",
].join(")|(") + ")", "gi");

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {

	const lowered = message.text.toLowerCase();


	return Promise.resolve(
		{ isQuestion: (
			lowered.split(' ').length >= 3 
			&& !lowered.match(blacklist) && (
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
