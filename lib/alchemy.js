const axios = require('axios');
const blacklist = require('./blacklist.json');

const auth = require('../constants');

var key = auth.alchemy_key;
let keys = auth.alchemy_keys;
const blacklist_str = "(" + blacklist.join(")|(") + ")";
const blacklist_regex = new RegExp(blacklist_str);


const _url = 'http://access.alchemyapi.com/calls';
const _urlBases = {
    text: _url + '/text/Text',
    url: _url + '/url/URL',
    html: _url + '/html/HTML'
};

/* function init(new_key, new_keys) {
    new_keys = new_keys || [];

    key = new_key;
    keys = new_keys;
} */


function rotate_key() {
    key = keys.shift();
    keys.push(key);
}


function _post(contentType, endpoint, content, args, rotatable) {

    rotatable = rotatable || true;

    let body = Object.assign({}, {
        apikey: key,
        outputMode: 'json',
        [contentType]: content,
    }, args);

    let config = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    return axios.post(_urlBases[contentType] + endpoint, urlEncode(body), config)
        .then(res => {
            let parsed = res.data;
            if(parsed.status == 'ERROR') {
                if(parsed.statusInfo == 'daily-transaction-limit-exceeded' && rotatable) {
                    rotate_key()
                    return _post(contentType, endpoint, content, args, false)
                }
                return Promise.reject(new Error(parsed.statusInfo));
            }
            return parsed;
        });
}

function getRelations(content, contentType) {
    contentType = contentType || "text";

    return _post(contentType, "GetRelations", content, {}).then(data => data.relations)
}

function getKeywords(content, contentType, sanitize) {
    contentType = contentType || "text";
    sanitize = sanitize || false;

    return _post(contentType, "GetRankedKeywords", content, {
        keywordExtractMode: 'normal',
        sentiment: 1
    }).then(data =>  {
        let kw = data.keywords || [];
        return sanitize ? kw.filter(sanitizer) : kw
    })

}

function getImageKeywords(content) {
    return _post("url", "GetRankedImageKeywords", content)
        .then(data =>  {

            let kw = data.imageKeywords || [];
            return kw;
        })

}

function sanitizer(content) {
    return !('text' in content && blacklist_regex.test(content['text']));
}

function getAllTheThings(content, contentType, sanitize) {
    sanitize = sanitize || false;
    contentType = contentType || 'text';

    return _post(contentType, 'GetCombinedData', content, {
        extract: 'concept,entity,keyword,taxonomy,doc-emotion,relation',
        knowledgeGraph: 1,
        sentiment: 1,
        quotations: 1,
        keywordExtractMode: 1
    }).then(data => {
        console.log(data);
        return {
            concepts: data.concepts.filter(sanitizer),
            entities: data.entities.filter(sanitizer),
            keywords: data.keywords.filter(sanitizer),
            taxonomy: data.taxonomy.filter(sanitizer),
            emotions: data.docEmotions,
            relations: data.relations
        };
    })
}




// why
let urlEncode = obj => {
    let str = [];
    for(let p in obj) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
    return str.join("&");
};

module.exports = {
    getAllTheThings,
    getKeywords,
    getImageKeywords,
    getRelations
}
