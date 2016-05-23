const alchemy = require('../lib/alchemy');

const Process = message => {

	/*const re = /(https?:\/\/.*\.(?:png|jpg))([^ ]+)/g;
	const found = message.text.match(re);
	if(!found)
		return Promise.resolve();

	let image_link = found[0].replace('>','');*/

	const links = message.links;
	if(links.length == 0)
		return Promise.resolve();

	const image_link = message.links[0].url;

	return alchemy.getImageKeywords(image_link)
		.then(things => ({ imageTags: things }))
		.catch(err => {
			console.log("Preprocessor: " + err);
		})
}

module.exports = {
	Process,
	key: 'imageTags',
	requirements: ['links']
}
