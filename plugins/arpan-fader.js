const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

function* onMessage(message) {

	const match = message.text.match(/arpan|fader/g);
	if(!match || match.length < 2)
		return false;

	const session = driver.session();

	return session.run(`
		MATCH (u:User {name: "thearpan"})--(m:Message)--(l:Link)
		WHERE l.id =~ '.*fader.*'
		RETURN count(m) as posts
	`, {})
	.then(res => res.records[0].get('posts').toInt())
	.then(posts => `arpan has posted ${posts} fader link${posts == 1 ? '' : 's'}`)
	.catch(err => console.log('error in arpanfader', err))

}

module.exports = {
	onMessage,
	key: msg => 'arpan-fader'
}
