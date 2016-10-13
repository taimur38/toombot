const neo4j = require('neo4j-driver').v1;
const driver = neo4j.driver(`bolt://${process.env.NEO_URL}`, neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS))

const nlc = require('../lib/nlc')

const onMessage = message => {

	message.
	const match = message.text.match(/update|training/gi)

	if(!match || match.length < 3)
		return Promise.resolve(false);

	const session = driver.session();

	return session.run(`
		MATCH (u:User {name: "toombot"})-->(m:Message)<-[r:REACTED]-(target:User)
		return m.text as comment, r.type as reaction, count(distinct(r)) as counts
	`)
	.then(res => res.records.map(r => ({
			comment: r.get('comment'),
			reaction: r.get('reaction'),
			count: r.get('counts').toInt()
	})))
	.then(reactions => reactions.filter(r => r.reaction.match(/\+1|-1/g) !== undefined))
	.then(reactions => {

		const cmap = new Map();

		reactions.forEach(({ comment, reaction, count}) => {
			const modifier = reaction.test(/\+1/g) ? 1 : -1;
			cmap.set(comment, (cmap.get(comment) || 0) + modifier * count);
		})

		console.log(cmap);

		let formatted = []; // { classes: ['good', 'bad'], text: ''}
		cmap.forEach((count, comment) => {
			if(count == 0)
				continue;

			const cls = count > 0 ? 'good' : 'bad';
			formatted.push({ classes: [cls], text: comment })
		})

		return formatted;
	})
	.then(training_data => nlc.createClassifier('toombot-output', training_data))
	.then(resp => `training new classifier`)
	.catch(err => console.log('error in update nlc', err))

}

module.exports = {
	onMessage
}
