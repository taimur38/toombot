const alchemy = require("../lib/alchemy");

alchemy.init()

const onMessage = message => {

	// if toombot in message
	// if positive
	if(message.text.toLowerCase().indexOf("toombot") < 0)
		throw new Error("toombot not in message");


	return alchemy.getKeywords(message.text)
		.then(keywords => {
			for(let kw of keywords) {
				if(kw.text.toLowerCase() == "toombot") {
					if(kw.sentiment) {
						// kw.sentiment.score > 0 {}
					}
				}
			}
		})
}
