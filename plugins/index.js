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

const actors = new Map(); // { filter: fn => bool, generator: {}}

// return observable?
const onMessage = message => {

	const channel = message.channel.id;

	return plugins.map(plugin => {
		const key = channel + '-' + plugin.key(message);

		let actor;
		if(actors.has(key)) {
			actor = actors.get(key);
			if(!actor.filter(message)) {
				actors.delete(key);
			}
			else {
				const output = actor.generator.next(message);
				if(output.done) {
					actors.delete(key);
					if(output.value && typeof output.value.then === 'function') {
						return output.value.then(rsp => rsp.text)
					}
					return output.value == undefined ? { response: false, message } : { response: output.value.text, message } ;
				}
				if(output.value && typeof output.value.then === 'function') {
					return output.value.then(rsp => {
						actors.set(key, { filter: rsp.filter, generator: actor.generator })
						return { response: rsp.text, message };
					})
				}
				actors.set(key, { filter: output.value.filter, generator: actor.generator })
				return { response: output.value.text, message };
			}
		}

		if(!plugin.filter(message))
			return Promise.resolve(false);

		actor = plugin.onMessage(message); // returns generator

		const output = actor.next(message); // output.value = { filter: msg => { return boolean }, text: ''}

		if(output.value && typeof output.value.then === 'function') {
			return output.value.then(rsp => {
				if(!output.done) {
					actors.set(key, { filter: rsp.filter, generator: actor })
					return {response: rsp.text, message}
				}
				return { response: rsp ? rsp.text : rsp, message }
			});
		}

		if(!output.done) {
			actors.set(key, { filter: output.value.filter, generator: actor })
		}

		return Promise.resolve({ response: output.value.text, message });

	});

}

module.exports = onMessage;
