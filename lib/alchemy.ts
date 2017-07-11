import * as axios from 'axios';
import blacklist from './blacklist';
import moment = require('moment') //sorry

import { alchemy_key, alchemy_keys } from '../constants';

var key = alchemy_key;
let keys = alchemy_keys;
const blacklist_str = "(" + blacklist.join(")|(") + ")";
const blacklist_regex = new RegExp(blacklist_str);


const _url = 'https://access.alchemyapi.com/calls';
const _urlBases : Object & {[p: string] : string} = {
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
			})
			.catch(err => {
				console.error('alchemy!', err);
				reject(err)
			})
		})
}

export function getRelations(content : string, contentType : string) {
	contentType = contentType || "text";

	return _post(contentType, "GetRelations", content, {})
		.then((data : any) => data.relations)
}

export function getKeywords(content : string, contentType : string, sanitize : boolean) {
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

export function getImageKeywords(content : string) {
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

interface Concept {
	text: string,
	relevance: number,
	knowledgeGraph?: {
		typeHierarchy?: string
	},
	website?: string,
	dbpedia?: string,
	freebase?: string,
	yago?: string,
}

interface Entity {
	text: string,
	relevance: number,
	knowledgeGraph?: {
		typeHierarchy?: string
	},
	website?: string,
	dbpedia?: string,
	freebase?: string,
	yago?: string,
	sentiment: Sentiment,
	emotions: Emotions,
	count: number,
	type?: string
}

interface Sentiment {
	type: string,
	score?: number
}

interface Emotions {
	anger: string,
	disgust: string,
	fear: string,
	joy: string,
	sadness: string 
}

export function getAllTheThings(content : string, contentType? : string, sanitize? : boolean, timeout?: number) : Promise<AllTheThings> {
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
let urlEncode = (obj : Object & {[p: string] : string }) => {
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
