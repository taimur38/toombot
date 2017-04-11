import { MinionModule, SlackMessage, MinionResult } from '../types';
import * as alchemy from './alchemize';

function* onMessage(message : SlackMessage & alchemy.Response) : Iterator<Promise<MinionResult>> {

    if(!message.alchemy)
        return;

    const emo = message.alchemy.emotions;

    if(emo.disgust > .7 || emo.anger > .7)
        return Promise.resolve({
            emoji: "disappointed",
            send: true
        })

    if(emo.joy > .6)
        return Promise.resolve({
            emoji: "shiny_eyes",
            send: true
        })

    if(message.text.search(/fiona/gi) > -1)
        return Promise.resolve({
            emoji: "fiona",
            send: true
        })

    return Promise.resolve({
        emoji: "toombot",
        send: true
    })
}

const mod : MinionModule = {
    key: 'soul',
    onMessage,
    filter: (msg : SlackMessage) => msg.mentions.some(x => x.name == "toombot") || msg.text.search(/(toombot|fiona)/gi) > -1,
    requirements: ['alchemy']
}

export default mod;
