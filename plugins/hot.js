
let prev = Date.now();
const temp_thresh = 80;
const time_thresh = 15 * 60 * 1000; // 5 minutes

const onMessage = message => {

	if(!message.temperature)
		return Promise.resolve(false);

	const metric = message.temperature.recentMessages * message.temperature.numParticipants;

	// need to know how many ppl in the channel
	const curr = Date.now();
	if(metric > 100 && (curr - prev)/1000 > time_thresh) {

		prev = curr;
		return Promise.resolve("This channel is hot!")

	}
	return Promise.resolve(false);
}

module.exports = {
	onMessage
}
