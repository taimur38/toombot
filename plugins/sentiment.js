const axios = require('axios');
const alchemy = require('../lib/alchemy');

const onMessage = message => {

    if(!message.alchemy || !message.alchemy.keywords) {
        return false;
    }

    const keywords = message.alchemy.keywords;

    let total_sentiment = 0;
    for(let kw of keywords) {
        total_sentiment += parseFloat(kw.sentiment.score) || 0;
    }

    if(keywords.length > 0 && total_sentiment / keywords.length > 0.85) {
        return Promise.resolve('Hey, glad to hear!');
    }

    if(keywords.length > 0 && total_sentiment / keywords.length < -0.85) {
        return Promise.resolve('Hey, cheer up!');
    }

    return Promise.resolve(false)

}

module.exports = {
    onMessage
}
