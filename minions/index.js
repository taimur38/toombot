
const global_minions = [
	//require('shit')
]
/* array of objects with:
{
	key: msg => string,
	onMessage: msg => generator, where generator.value returns {
	Promise<{send: true|false|undefined, [key]: whatever, filter: fn(msg) => bool}> }
}
*/

const minion_map = new Map(); //

export async function dispatch(emitter, message) {

	const scheduled_minions = schedule(message);

	let processed_message = message;
	for(let minions of scheduled_minions) {
		const responses = await Promise.all(
			minions
				.filter(m => m.requirements.every(req => processed_message[m.req])
				.map(m => {
					const output = m.generator.next(processed_message);
					return output.value.then(r => ({ value: r, done: output.done }))
				})

		const senders = responses.filter(x => x.value.send);
		senders.map(msg => emitter.emit('send', {
			response: msg.value.text,
			message
		}));

		// pass processed_message to next round of minions
		processed_message = responses
			.filter(x => !x.value.send)
			.reduce((agg, curr) => ({ ...agg, ...curr }), {})
	}
}

function schedule(message) {
	// the context a minion is available to cannot change over time
	// but the requirements list can.

	// this will either pass existing enerator in minion_map or initialize new generator if doesnt exist.
	const normalized = global_minions
		.map(m => {
			const m_key = m.key(message)
			const key = `${message.channel.id}-${m_key}`

			if(minion_map.has(key)) {
				const minion = minion.get(key);
				if(!minion.generator.done && minion.filter(message)) {
					return { generator: minion.generator, requirements: minion.requirements, key: m_key } // aka return minion

				minion_map.delete(key);
			}

			if(m.filter(message)) {
				const generator = m.onMessage(message);
				return { generator, requirements: m.requirements, key: m_key }
			}
		})
		.filter(n => n)

	// schedule normalized minions based on requirements. return array of arrays of normalized minions
	let orders = {};

	const calculate = (service_key) => {
		if(orders[service_key])
			return orders[service_key];

		orders[service_key] = -100;

		const reqs = normalized.find(m => m.key == service_key).requirements;

		if(!reqs || reqs.length == 0) {
			orders[service_key] = 0;
			return 0;
		}

		let max_req = -1;
		for(let s of reqs) {
			const dependency_order = calculate(s);
			if(dependency_order < 0) {
				console.log('there is a requirement cycle', service_key, 'depends on', s)
				process.exit(1)
			}
			max_req = Math.max(max_req, dependency_order + 1);
		}

		orders[service_key] = max_req;
		return max_req;
	}

	normalized.forEach(m => calculate(m.key));

	let scheduled_minions = [];
	for(let service_key in orders) {
		let curr = [];
		if(orders[service_key] < scheduled_minions.length) {
			curr = scheduled_minions[orders[service_key]] || [];
		}
		curr.push(normalized.find(n => n.key == service_key));
		scheduled_minions[orders[service_key]] = curr;
	}

	return scheduled_minions;

}
