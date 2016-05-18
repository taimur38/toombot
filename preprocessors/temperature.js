/*

the goal of this preprocessor is to monitor how 'active' a chatroom is.

the temprature of the chatroom should be a function of:
	- number of parties participating
	- how quickly messages are being responded to

this preprocessor considers only the previous n minutes of history

*/

let rooms = {}; // key: message channel value: array of message timestamps

const max_history = 10 * 60 * 1000; // 10 minutes

const Process = message => {

	let prev = rooms[message.channel];

	const curr = Date.now();

	rooms[message.channel] = [
		...rooms[message.channel],
		new Date(parseFloat(message.ts) * 1000)
	].filter(timestamp => now - timestamp < max_history);

	

}

module.exports = {
	Process
}
