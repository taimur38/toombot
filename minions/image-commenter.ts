import { SlackMessage, MinionModule, MinionResult } from '../types'
import * as axios from 'axios'
import * as imagize from './image-ize';

const reddit_session = axios.create({
	baseURL: 'http://reddit.com',
	headers: {
		'User-Agent': '/u/taimur38'
	},
	timeout: 3000
})

const key = 'imageCommenter'

function* onMessage(message : SlackMessage & imagize.Response) : Iterator<Promise<MinionResult>> {

    console.log(JSON.stringify(message.imageTags[0].classes, undefined, 2))

    const query = message.imageTags[0].classes
        .map(c => ({ ...c, super_score: c.type_hierarchy == undefined ? c.score : c.score + c.type_hierarchy.split('/').length/3 }))
        .filter(c => c.super_score > 0.8)
        .sort((a, b) => b.super_score - a.super_score)
        .slice(0, 2)
        .reduce((agg, curr) => agg + '(' + curr.class.split(' ').join(' AND ') + ') OR ', '')

    
    console.log(query);
    return reddit_session.get(`/search.json?q=${query}`)
        .then(rsp => {
            if(rsp.data)
                return (<any>rsp.data).data.children;
            throw new Error('no results')
        })
        .then(posts => {
            const post = posts[0]
            if(post.is_self)
                return {
                    send: true,
                    text: post.data.selftext + ': ' + post.data.url
                }
            else
                return {
                    send: true,
                    text: post.data.title + ': ' + post.data.url
                }
        })
}

const mod : MinionModule = {
    onMessage,
    key,
    requirements: ['imageTags']
}

export default mod;