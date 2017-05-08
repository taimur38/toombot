import * as NLU from '../lib/nlu';

export interface Response {
	NLU: NLU.AnalyzeResult
}

function* onMessage(message : SlackMessage) : Iterator<Promise<Response>> {

	const text = message.text;

	return NLU.analyze(text)
		.then(result => ({ NLU: result }))
		.catch((err : Error ) => {
			console.log('Preprocessor: ' + err)
			return;
		})
}

export default {
	onMessage,
	key: 'NLU',
	requirements: [],
}