const axios = require('axios');

const session = axios.create({
    baseURL: 'https://gateway.watsonplatform.net/relationship-extraction-beta/api',
    // baseURL: 'http://localhost:4034',
    auth: {
        username: '59d3b274-3fb8-4870-93b8-58aecbde601c',
        password: 'VSzOj4r5Zsr1'
    },
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
