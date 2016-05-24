const alchemy = require('../lib/alchemy');

const Process = message => {

	const links = message.links;
	if(links.length == 0)
		return Promise.resolve();

	const image_link = message.links[0].url;

	if(image_link.match(/png|jpg|jpeg|gif/)) {
		return alchemy.getImageKeywords(image_link)
			.then(things => ({ imageTags: things }))
			.catch(err => {
				console.log("Preprocessor: " + err);
			})
		}
	return Promise.resolve();
}

module.exports = {
	Process,
	key: 'imageTags',
	requirements: ['links']
}
