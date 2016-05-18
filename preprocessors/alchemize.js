const alchemy = require('../lib/alchemy');

const Process = message => {

	console.log(message)
	const text = message.text;

	return alchemy.getAllTheThings(text)
		.then(things => Object.assign({}, message, {
			alchemy: things
		}))
}

module.exports = {
	Process
}
