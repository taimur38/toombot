import * as axios from 'axios'
import { NLUCreds } from '../constants'

const _url = 'https://gateway.watsonplatform.net/natural-language-understanding/api/v1/'

const version = 'version=2017-02-27';

const session = axios.create({
    baseURL: _url,
    auth: NLUCreds
})

type NLUContentType = 'text' | 'url' | 'html';

export interface Sentiment {
    score: number
}

export interface Emotions {
    sadness: number,
    joy: number,
    fear: number,
    disgust: number,
    anger: number
}

export interface Keyword {
    text: string,
    sentiment: { score: number },
    relevance: number,
    emotion: Emotions
}

export interface Entity extends Keyword {
    type: string,
    disambiguation: {
        subtype: string[],
        name: string,
        dbpedia_resource: string
    }
}

export interface Concept {
    text: string,
    relevance: number,
    dbpedia_resource: string
}

export interface Categories {
    score: number,
    label: string
}

export interface Metadata {
    authors: { name: string }[],
    feeds: { link: string }[],
    publication_date: string,
    title: string
}

export interface Relation {
    type: string,
    sentence: string,
    score: number,
    arguments: {
        text: string,
        entities: { type: string, text: string }[],
    }
}

export interface SemanticRole {
    sentence: string,
    subject: { text: string, entity?: Entity, keyword?: Keyword },
    action: { text: string, normalized: string, verb: { text: string, tense: string }}
}

export interface AnalyzeResult {
    language: string,
    analyzed_text?: string,
    retreived_url?: string,
    concepts: Concept[],
    categories: Categories[],
    emotion: Emotions,
    entities: Entity[],
    keywords: Keyword[],
    metadata: Metadata,
    relations: Relation[],
    semantic_roles: SemanticRole[],
    sentiment: Sentiment
}

export function analyze(content: string, contentType: NLUContentType = 'text', timeout?: number) : Promise<AnalyzeResult> {

    return new Promise((resolve, reject) => session.post('/analyze', {
        [contentType]: content,
        features: {
            entities: {
                emotion: true,
                sentiment: true,
            },
            keywords: {
                emotion: true,
                sentiment: true
            },
            categories: {},
            emotion: {
                document: true
            },
            concept: { },
            metadata: {},
            relations: {},
            semantic_roles: { keywords: true },
            sentiment: {
                document: true
            }
        }
    }, { params: { version } })
        .then(resp => {
            const data = resp.data;

            resolve(resp.data as AnalyzeResult)
        })
        .catch(reject));
}