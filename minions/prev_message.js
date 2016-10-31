let prev_message;

const Process = message => {
	let temp_message = prev_message;
	prev_message = message;
	return Promise.resolve({prevMessage: temp_message});
}

module.exports = {
	Process,
	key: 'prevMessage',
	requirements: ['alchemy']
}
