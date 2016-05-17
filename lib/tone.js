const axios = require("axios");

const session = axios.create({
    baseURL: 'https://gateway.watsonplatform.net/tone-analyzer-beta/api',
    auth: {
        username: 'bd8ca788-c7a9-4440-906d-dcbd3509ee5b',
        password: '5VRrF8Hb5vug'
    },
    headers: {
        'Content-Type': 'text/plain'
    }
});

function annotate(text) {
    return session.post('/v3/tone?version=2016-02-11', { text }).then(rsp => rsp.data.document_tone)
}

module.exports = {
    annotate
}
