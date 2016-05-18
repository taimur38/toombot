const axios = require('axios');
const auth = require('../constants');

const session = axios.create({
    baseURL: 'https://gateway.watsonplatform.net/concept-insights/api/v2',
    auth: auth.conceptInsights

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
