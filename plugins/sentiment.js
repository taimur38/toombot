const axios = require('axios');
const alchemy = require('../lib/alchemy');

const onMessage = message => {

    return alchemy.getKeywords(message.text)
        .then(keywords => {

            let total_sentiment = 0;
            for(let kw of keywords) {
                total_sentiment += parseFloat(kw.sentiment.score) || 0;
            }

            if(keywords.length > 0 && total_sentiment / keywords.length > 0.75) {
                return 'Hey, glad to hear!';
            }
            else if(keywords.length > 0 && total_sentiment / keywords.length < -0.75) {
                return 'Hey, cheer up!';
            }
            else {
                throw new Error('no comments');
            }
        })
}

module.exports = {
    onMessage
}
