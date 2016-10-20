const plugins = [
	require('./reddit'),
	require('./wolfram'),
	require('./medium'),
	require('./genius'),
	require('./verge'),
	require('./navigation'),
	require('./arpan-fader'),
	require('./update-nlc'),
	require('./search'),
	require('./hello')
	//wrapper(require('./reddit-enrichment').onMessage),
	//wrapper(require('./image-tagging').onMessage),
	//wrapper(require('./hot').onMessage),
	//wrapper(require('./context-debug').onMessage)
	//wrapper(require('./sentiment').onMessage),
	//wrapper(require('./location').onMessage)
];

// each plugin is a generator. there is one generator per channel.

const actors = new Map();

// return observable?
const onMessage = message => {

	const channel = message.channel.id;

	return plugins.map(plugin => {
		const key = channel + '-' + plugin.key(message);

		let actor;
		if(actors.has(key)) {
			actor = actors.get(key);
		} else {
			actor = plugin.onMessage(message);
			actors.set(key, actor);
		}

		const output = actor.next(message);

		if(output.done)
			actors.delete(key);

		if(output.value && typeof output.value.then === 'function') {
			return output.value.then(v => ({ response: v, message }));
		}

		return Promise.resolve({ response: output.value, message });

	});

}

module.exports = onMessage;
