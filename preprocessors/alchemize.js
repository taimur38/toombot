const alchemy = require('../lib/alchemy');

const Process = message => {

	const text = message.text;

	return alchemy.getAllTheThings(text)
		.then(things => ({ alchemy: things }))
		.catch(err => {
			console.log("Preprocessor: " + err);
			return {};
		})
}

module.exports = {
	Process
}
