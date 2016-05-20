/*

the goal of this preprocessor is to monitor how 'active' a chatroom is.

the temprature of the chatroom should be a function of:
	- number of parties participating
	- how quickly messages are being responded to

this preprocessor considers only the previous n minutes of history

*/

let rooms = {}; // key: message channel value: array of message timestamps

const max_history = 2 * 60 * 1000; // 2 minutes

const Process = message => {

	let prev = rooms[message.channel] || [];

	const curr = Date.now();

	rooms[message.channel] = [
		...prev,
		message,
	].filter(messages => curr - messages.ts < max_history);

	let people = rooms[message.channel].map(m => m.user.name);
	people = people.filter((p, i) => people.indexOf(p) == i);

	return new Promise((resolve, reject) =>
		resolve({
			temperature: {
				recentMessages: rooms[message.channel].length,
				numParticipants: people.length
			}
		})
	);
}

module.exports = {
	Process
}
