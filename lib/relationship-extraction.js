const axios = require('axios');
const auth = require('../constants');

const session = axios.create({
    baseURL: 'https://gateway.watsonplatform.net/relationship-extraction-beta/api',
    auth: auth.relationshipExtraction,
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
});

function annotate(text) {
    return session.post('',`sid=ie-en-news&rt=json&txt=${encodeURIComponent(text)}`).then(rsp => rsp.data.doc.mentions.mention)
}

module.exports = {
    annotate
};
