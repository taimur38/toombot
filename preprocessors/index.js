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
		return orders[service_key]
	}

	const reqs = proc_dict[service_key].requirements;

	if(reqs.length == 0) {
		orders[service_key] = 0;
		return 0;
	}

	let max_req = -1;
	for(let s of reqs) {
		max_req = Math.max(max_req, calculate(s) + 1)
	}

	orders[service_key] = max_req;
	return max_req;
}

for(let p of processors) {
	calculate(p.key); 	// builds out the 'orders' dictionary
}


let scheduled_procs = [];   // array of arrays of processors
for(let service_key in orders) {
	let curr = [];
	if(orders[service_key] < scheduled_procs.length) {
		curr = scheduled_procs[orders[service_key]];
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
