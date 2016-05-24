const processors = [
	require('./alchemize'),
	require('./temperature'),
	require('./tonalize'),
	require('./image-ize'),
	require('./isQuestion'),
	require('./links'),
	require('./context')
];

let proc_dict = {};
for(let p of processors) {
	proc_dict[p.key] = p;
}

let orders = {};
const calculate = (service_key) => {

	if(orders[service_key]) {
		return orders[service_key];
	}

	orders[service_key] = -100;    // use this to detect require cycles

	const reqs = proc_dict[service_key].requirements;

	if(reqs.length == 0) {
		orders[service_key] = 0;
		return 0;
	}

	let max_req = -1;
	for(let s of reqs) {
		const dependency_order = calculate(s);
		if(dependency_order < 0) {
			console.log("there is a requirement cycle in preprocessors");
			process.exit(1);
		}
		max_req = Math.max(max_req, dependency_order + 1);
	}

	orders[service_key] = max_req;
	return max_req;
}

processors.forEach(p => calculate(p.key)); // builds out 'orders' dict

let scheduled_procs = [];   // array of arrays of processors
for(let service_key in orders) {
	let curr = [];
	if(orders[service_key] < scheduled_procs.length) {
		curr = scheduled_procs[orders[service_key]] || [];
	}

	curr.push(proc_dict[service_key].Process)
	scheduled_procs[orders[service_key]] = curr;
}

const Process = raw_message => {

	let running_promise = Promise.resolve(raw_message);
	for(let procs of scheduled_procs) {
		running_promise = running_promise
			.then(message => Promise.all( procs.map(p => p(message).then(res => Object.assign({}, message, res)) )))
			.then(results => results.reduce( (p, c) => Object.assign({}, p, c)) )
	}

	return running_promise;
}

module.exports = Process
