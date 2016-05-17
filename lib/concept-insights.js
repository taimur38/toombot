const axios = require('axios');

const session = axios.create({
    baseURL: 'https://gateway.watsonplatform.net/concept-insights/api/v2',
    auth: {
        username: '6faf75a5-92b8-435e-a55d-ead475fae1b1',
        password: 'MOKoxXllex4u'
    }
});

function annotate(text) {
    return session.post(`/graphs/wikipedia/en-20120601/annotate_text`, text, {
        headers: { 'Content-Type': 'text/plain' }
    }).then(rsp => rsp.data.annotations)
}

function annotateWithMetadata(text) {
    return annotate(text)
        .then(annotations =>
            Promise.all(annotations.map(annotation => session.get(`${annotation.concept.id}`)
                .then(ann => Object.assign(
                    ann.data,
                    {
                        score: annotation.score,
                        text_index: annotation.text_index
                    }
                ))
            ))
        )
}

module.exports = {
    annotate,
    annotateWithMetadata
}
