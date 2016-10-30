import * as axios from 'axios';
import blacklist from './blacklist';
import moment = require('moment') //sorry

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


function _post(contentType : string, endpoint : string, content : string, args? : any, rotatable? : boolean) : Promise<any> {

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

	return new Promise((resolve,reject) => {
		axios.post(_urlBases[contentType] + endpoint, urlEncode(body), config)
			.then((res : any) : any => {
				let parsed : any = res.data;
				if(parsed.status == 'ERROR') {
					if(parsed.statusInfo == 'daily-transaction-limit-exceeded' && rotatable) {
						rotate_key()
						return _post(contentType, endpoint, content, args, false)
					}
					return reject(new Error(parsed.statusInfo));
				}
				return resolve(parsed);
			});
		})
}

function getRelations(content : string, contentType : string) : axios.Promise {
	contentType = contentType || "text";

	return _post(contentType, "GetRelations", content, {})
		.then((data : any) => data.relations)
}

function getKeywords(content : string, contentType : string, sanitize : boolean) {
	contentType = contentType || "text";
	sanitize = sanitize || false;

	return _post(contentType, "GetRankedKeywords", content, {
		keywordExtractMode: 'normal',
		sentiment: 1
	}).then((data : any) =>  {
		let kw = data.keywords || [];
		return sanitize ? kw.filter(sanitizer) : kw
	})

}

function getImageKeywords(content : string) {
	return _post("url", "GetRankedImageKeywords", content)
		.then((data : any) =>  {

			let kw = data.imageKeywords || [];
			return kw;
		})

}

function sanitizer(content : any) {
	return !('text' in content && blacklist_regex.test(content['text']));
}

export interface AllTheThings {
	concepts: any[],
	entities: any[],
	keywords: any[],
	taxonomy: any[],
	emotions: any,
	relations: any[],
	sentiment: any,
	imageKeywords: any[],
	dates: any[]
}

export function getAllTheThings(content : string, contentType? : string, sanitize? : boolean) : Promise<AllTheThings> {
	sanitize = sanitize || false;
	contentType = contentType || 'text';


	return _post(contentType, 'GetCombinedData', content, {
		extract: 'concept,entity,keyword,taxonomy,doc-emotion,relation,doc-sentiment,dates',
		knowledgeGraph: 1,
		sentiment: 1,
		quotations: 1,
		emotion: 1,
		language: "english",
		keywordExtractMode: 1,
		anchorDate: moment().format('YYYY-MM-DD hh:mm:ss')
	}).then((data : any) : AllTheThings => {
		return {
			concepts: data.concepts ? data.concepts.filter(sanitizer) : [],
			entities: data.entities ? data.entities.filter(sanitizer) : [],
			keywords: data.keywords ? data.keywords.filter(sanitizer) : [],
			taxonomy: data.taxonomy ? data.taxonomy.filter(sanitizer) : [],
			emotions: data.docEmotions || {},
			relations: data.relations || [],
			sentiment: data.docSentiment || {},
			imageKeywords: data.imageKeywords || [],
			dates: data.dates
		};
	})
}

// why
let urlEncode = (obj : Object) => {
	let str = [];
	for(let p in obj) {
		str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
	}
	return str.join("&");
};

export default {
	getAllTheThings,
	getKeywords,
	getImageKeywords,
	getRelations
}
