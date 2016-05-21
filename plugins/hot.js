const temp_thresh = 80;
const time_thresh = 15 * 60 * 1000; // 5 minutes

let prev = Date.now();

const onMessage = message => {

	if(!message.temperature)
		return Promise.resolve(false);

	const metric = message.temperature.recentMessages * message.temperature.numParticipants;

	// need to know how many ppl in the channel
	const curr = Date.now();
	if(metric > temp_thresh && (curr - prev) > time_thresh) {

		prev = curr;
		return Promise.resolve("This channel is hot!")

	}
	return Promise.resolve(false);
}

module.exports = {
	onMessage
}
