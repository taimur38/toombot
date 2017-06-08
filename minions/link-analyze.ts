import * as links from './links'
import { getAllTheThings } from '../lib/alchemy';

function* onMessage(message : SlackMessage & links.Response) : Iterator<Promise<Response>> {

	if(message.links.length == 0)
		return;
    
    return getAllTheThings(message.links[0].url, 'url', false)
        .then(resp => {
            const assertions = resp.relations
                .filter(r => r.action.lemmatized.indexOf("be") > -1 || r.action.lemmatized.indexOf("think") > -1)
                .map(r => r.sentence)
                .filter((sentence, idx, all) => all.findIndex(x => x == sentence) == idx)
            
            return {
                //text: "\`\`\`" + assertions.map(s => "- " + s.trim()).join('\n') + "\`\`\`",
                text: assertions.map(s => "• " + s).join('\n'),
                send: true,
                threadReply: true
            }
        })
        .catch(err => console.error("link analyze", err))

}
/*
 if(alchemy.has("relations")) {
 14             JSONArray relations = alchemy.getJSONArray("relations");
 13
 12             HashSet<String> existing = new HashSet<String>();
 11             for(int i = 0; i < relations.length(); i++) {
 10                 JSONObject r = relations.getJSONObject(i);
  9
  8                 try {
  7                     if(r.getJSONObject("action").getString("lemmatized").indexOf("be") >= 0) {
  6                         String s = r.getString("sentence");
  5                         if(!existing.contains(s)) {
  4                             Sentences.add(s);
  3                             existing.add(s);
  2                         }
  1                     }
  0                 } catch(Exception e) {
  1
  2                 }
  3
  4             }
  5         }
  */

const mod : MinionModule = {
	onMessage,
	key: 'link_analyze',
	requirements: ['links']
}

export default mod;
