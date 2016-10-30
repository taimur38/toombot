import alchemy from './alchemize';
import hello from './hello';
import { EventEmitter } from 'events';
import { MinionModule, ActiveMinion } from '../types';

const global_minions : MinionModule[] = [
	alchemy,
	hello
]

const minion_map = new Map<string, ActiveMinion>(); //

export async function dispatch(emitter : EventEmitter, message : any) {

	const scheduled_minions = schedule(message);

	let processed_message = message;
	for(let minions of scheduled_minions) {
		const responses : any[] = await Promise.all(
			minions
				.filter(m => m.requirements.every(req => {
					return processed_message[req];
				}))
				.map(m => {
					const output = m.generator.next(processed_message);
					return output.value.then((r : Object) => ({
						value: r,
						done: output.done,
						minion: m
					}))
				}))

		const senders = responses.filter(x => x.value.send);
		senders.forEach(msg => emitter.emit('send',
			msg.value.text,
			message
		));

		// update map
		responses.forEach((response : any) => {

			const m_key = `${message.channel.id}-${response.minion.key}`;
			if(response.done) {
				minion_map.delete(m_key)
			} else  {
				minion_map.set(m_key, {
					generator: response.minion.generator as Iterator<Promise<any>>,
					requirements: response.value.requirements || [] as string[],
					filter: response.value.filter,
					key: response.minion.key
				})
			}
		})

		// pass processed_message to next round of minions
		processed_message = responses
			.filter(x => !x.value.send)
			.reduce((agg : any, curr : any) => {
				return Object.assign({}, agg, curr.value);
			}, {})
	}
}

function schedule(message : any) {
	// the context a minion is available to cannot change over time
	// but the requirements list can.

	// this will either pass existing enerator in minion_map or initialize new generator if doesnt exist.
	const normalized : ActiveMinion[] = [];
	global_minions
		.forEach((m : MinionModule) : void => {

			const m_key = m.key(message)
			const key = `${message.channel.id}-${m_key}`

			if(minion_map.has(key)) {
				const minion = minion_map.get(key);
				if(minion.filter(message)) {
					normalized.push(minion) // aka return minion
					return;
				}

				minion_map.delete(key);
			}

			if(m.filter(message)) {
				const generator = m.onMessage(message);
				// console.log(generator.next())
				normalized.push({ generator : generator, requirements: m.requirements, key: m_key, filter: m.filter })
				return;
			}
		})

	// schedule normalized minions based on requirements. return array of arrays of normalized minions
	let orders = new Map<string, number>();

	const calculate = (service_key : string) : number => {
		if(orders.has(service_key))
			return orders.get(service_key);

		orders.set(service_key, -100);

		const reqs = normalized.find(m => m.key == service_key).requirements;

		if(!reqs || reqs.length == 0) {
			orders.set(service_key, 0)
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

		orders.set(service_key, max_req)
		return max_req;
	}

	normalized.forEach(m => calculate(m.key));

	let scheduled_minions : ActiveMinion[][] = [];
	for(let service_key of orders.keys()) {
		let curr : ActiveMinion[] = [];
		if(orders.get(service_key) < scheduled_minions.length) {
			curr = scheduled_minions[orders.get(service_key)] || [];
		}
		curr.push(normalized.find(n => n.key == service_key));
		scheduled_minions[orders.get(service_key)] = curr;
	}

	return scheduled_minions;

}
