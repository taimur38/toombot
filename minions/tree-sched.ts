import { MinionModule, SlackMessage, ActiveMinion } from '../types'
interface Node {
	key: string,
	activeMinion: ActiveMinion,
	parents: string[],
	children: string[]
}

interface Tree {
	rootRow: Map<string, Node>
}

const minion_modules : MinionModule[] = [];

const schedule = (message : SlackMessage) : Map<string, Node>=> {
	const minion_map = new Map<string, Node>();

	const formTree = (m : MinionModule) : void => {
		const m_key = m.key(message) // this  needs to be not a function
		// first give minion_map an accurate picture of you.
		if(minion_map.has(m_key)) {
			const self = minion_map.get(m_key)
			self.parents = m.requirements;
			minion_map.set(m_key, self)
		} else {
			minion_map.set(m_key, {
				key: m_key,
				activeMinion: undefined,
				parents: m.requirements,
				children: [] as string[]
			})
		}

		// set children on minion_map for things you require
		m.requirements.forEach(req => {
			if(minion_map.has(req)) {
				const curr = minion_map.get(req)
				curr.children.push(m_key);
				minion_map.set(req, curr);
			} else {
				const curr : Node = { parents: [], children: [req], key: req, activeMinion: undefined }
				minion_map.set(req, curr)
			}
		})
	}

	minion_modules.forEach(formTree);

	// now have map that tells you what each key depends on, and what keys depend on it.

	return minion_map;
}

async function dispatch(message : SlackMessage) {

	const done_minions = new Set<string>();
	const minion_tree = schedule(message);

	const initial = [...minion_tree.entries()].filter(([k, v]) => v.parents.length == 0);

	let cumulativeMessage = message;

	const recheck = (pMessage : SlackMessage) => {
		const remaining = [...minion_tree.entries()]
			.filter(([key, node]) => !done_minions.has(key))
			.forEach(([key, node]) => run(key, node))
	}

	const run = async (key : string, minionNode : Node) => {
		const fn = minionNode.activeMinion.init || minionNode.activeMinion.generator.next
		const res = await fn(message)
		if(res.send !== undefined) {
			
		}
		done_minions.add(key)
		if(done_minions.size < minion_tree.size)
			recheck()
	}

	return Promise.all(initial.map(([k, v]) => run(k, v)))

}
