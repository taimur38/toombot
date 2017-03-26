import { EventEmitter } from 'events';
import { MinionModule, SlackMessage, ActiveMinion, MinionResult } from '../types'
import hello from './hello';
import alchemize from './alchemize'
import companies from './companies';
import context from './context';
import links from './links';
import linkMeta from './link-meta';
import reddit from './reddit';
import graphMeta from './graph-meta';
import graphMsg from './graph-msg'
import locations from './locations'
import heyToombots from './hey-toombots'
import isQuestion from './isQuestion'
import medium from './medium'
import wolfram from './wolfram'
import redditEnrichment from './reddit-enrichment';
import verge from './verge'
import imageize from './image-ize';
import imageCommenter from './image-commenter'
import tankHunter from './tank-hunter';
import stocks from './stocks';
import soul from './soul'

interface Node {
	key: string,
	activeMinion: ActiveMinion,
	parents: string[],
	children: string[]
}

/*
there is a list of minions that each message is passed to.

each message either goes to an existing minion
or we initialize a new one

so first we go down the list of required minions
	look through all existing minions that have same key as required minion.
		check if the minion context function returns true.
			if true, check the filter function.
				if filter true, push that minion into normalized minion array and continue to next required minion.
				if filter false, remove minion from existing minion. instantiate new one and continue to next required minion
			if false continue down list
		instantiate new minion and move to next required minion

now we have a normalized list of minions. schedule them, then execute
*/

const minion_modules : MinionModule[] = [
	//hello,
	alchemize,
	companies,
	context,
	links,
	linkMeta,
	reddit,
	graphMsg,
	graphMeta,
	locations,
	heyToombots,
	isQuestion,
	redditEnrichment,
	medium,
	verge,
	wolfram,
	imageize,
	tankHunter,
	stocks,
	soul
	//imageCommenter
];

let existing_minions : ActiveMinion[] = [];

const schedule = (message : SlackMessage) : Map<string, Node> => {
	const minion_map = new Map<string, Node>();

	const formTree = (m : MinionModule) : void => {
		const m_key = m.key
		// first give minion_map an accurate picture of you.
		if(minion_map.has(m_key)) {
			console.log('i already exist', m_key)
			const self = minion_map.get(m_key)
			self.parents = m.requirements
			if(self.activeMinion == undefined) {
				self.activeMinion = {
					key: m.key,
					init: m.onMessage,
					requirements: m.requirements || [],
					filter: m.filter || (() => true),
					contextMatch: () => true
				}
			}
			minion_map.set(m_key, self)
		} else {
			// check if there's an existing minion for this context.
			const existing_minion = existing_minions.find(e => e.key == m_key && e.contextMatch(message))

			if(existing_minion) {
				if(existing_minion.filter == undefined || existing_minion.filter(message)) {
					minion_map.set(m_key, {
						key: m_key,
						activeMinion: existing_minion,
						parents: existing_minion.requirements,
						children: [] as string[]
					})
				} else {
					//console.log('get rid of minion', m_key);
					existing_minions = existing_minions.filter(e => !(e.key == m_key && e.contextMatch(message)));
				}
			}

			if(!minion_map.has(m_key))
			{
				// no existing minion - make a new one.
				if(m.filter === undefined || m.filter(message)) {
					minion_map.set(m_key, {
						key: m_key,
						activeMinion: {
							key: m.key,
							init: m.onMessage,
							requirements: m.requirements || [],
							filter: m.filter || (() => true),
							contextMatch: () => true
						},
						parents: m.requirements || [],
						children: [] as string[]
					})
				} else {
					// not setting anything in map
					return;
				}
			}
		}

		// set children on minion_map for things you require
		if(m.requirements) {
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
	}

	minion_modules.forEach(formTree);

	// now have map that tells you what each key depends on, and what keys depend on it.

	return minion_map;
}

export async function dispatch(emitter : EventEmitter, message : SlackMessage) {

	const done_minions = new Set<string>();
	const inprocess_minions = new Set<string>();
	//console.log('scheduling')
	let minion_tree : Map<string, Node>;
	try {
		minion_tree = schedule(message);
	} catch(e) {
		console.error(e);
		return Promise.reject(e);
	}
	//console.log('scheduled')

	const initial = [...minion_tree.entries()].filter(([k, v]) => v.parents.length == 0);

	let cumulativeMessage = message;

	const recheck = () => {
		//console.log('rechecking')
		const remaining = [...minion_tree.entries()]
			.filter(([key, node]) => !done_minions.has(key) && !inprocess_minions.has(key))
			.forEach(([key, node]) => {
				if(node.parents.every(k => done_minions.has(k))) {
					//console.log('running', key);
					run(key, node)
				}
			})
	}

	const run = async (key : string, minionNode : Node) => {
		inprocess_minions.add(key);
		let generator = minionNode.activeMinion.init ? minionNode.activeMinion.init(cumulativeMessage) : minionNode.activeMinion.generator;

		const iterResult = generator.next(cumulativeMessage);
		const res = await iterResult.value;

		if(res && (res.send || res.text)) {
			console.log('sending', res);
			emitter.emit('send', res, message);

		}

		const existing_minion = existing_minions.find(e => e.key == key && e.contextMatch(cumulativeMessage));
		if(existing_minion) {
			//console.log('existing minion removed', existing_minion.key);
			existing_minions = existing_minions.filter(e => !(e.key == existing_minion.key && e.contextMatch(cumulativeMessage)));
		}
		if(!iterResult.done) {
			//console.log('not yet done', minionNode.key);
			const mod_minion = {
				key: minionNode.key,
				generator: generator,
				requirements: res.requirements || [],
				filter: res.filter || (() => true),
				contextMatch: res.contextMatch || minionNode.activeMinion.contextMatch || (( nMsg : SlackMessage) => nMsg.channel.id === cumulativeMessage.channel.id)
			}
			existing_minions.push(mod_minion);
			//console.log(existing_minions);
		}

		if(res && res[minionNode.key])
			cumulativeMessage = Object.assign({}, cumulativeMessage, { [key]: (res[minionNode.key] as any) });
		//else
			//console.log(minionNode.key, "not set");

		inprocess_minions.delete(key);
		done_minions.add(key)
		//console.log('done', key)
		//console.log([...minion_tree.keys()].filter(k => !done_minions.has(k)), 'is remaining');
		if(done_minions.size < minion_tree.size)
			recheck()
		else
			console.log('done');
	}

	return Promise.all(initial.map(([k, v]) => run(k, v)))

}
