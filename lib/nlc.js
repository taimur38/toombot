const watson = require('watson-developer-cloud')
const fs = require('fs');

const constants = require('../constants')

const nlc = watson.natural_language_classifier({
	url: 'https://gateway.watsonplatform.net/natural-language-classifier/api',
	username: constants.NLC.username,
	password: constants.NLC.password,
	version: 'v1'
});

const clean = text => `"${text.replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/"/g, '""')}"`

const listClassifiers = () => {

	return new Promise((resolve, reject) => {
		nlc.list({}, (err, response) => {
			if(err)
				return reject(err)

			return resolve(response.classifiers);
		})
	})
}

const classifierStatus = classifier_id => {
	return new Promise((resolve, reject) => {
		nlc.status({ classifier_id }, (err, resp) => {
			if(err)
				return reject(err);

			resolve(resp);
		})
	})
}

const listStatuses = () => listClassifiers().then(classifiers => Promise.all(classifiers.map(c => classifierStatus(c.classifier_id))))

const classify = (classifierName, text) => {

	return listClassifiers()
		.then(classifiers => {
			const relevant = classifiers.filter(c => c.name == classifierName);

			if(relevant.length == 0) {
				throw new Error('no classifier exists')
			}

			return Promise.all(relevant.map(c => classifierStatus(c.classifier_id)))

		})
		.then(statuses => {

			const cleaned = statuses.map(s => Object.assign({}, s, { created: new Date(s.created) }))
			const best_classifier = cleaned
				.filter(c => c.status == 'Available')
				.sort((a, b) => b.created - a.created)[0]

			if(best_classifier == undefined) {
				throw new Error('no available classifier')
			}

			return new Promise((resolve, reject) => {
				nlc.classify({
					text,
					classifier_id: best_classifier.classifier_id
				}, (err, resp) => {
					if(err)
						return reject(err);

					resolve(resp)
				})
			})
		})
}


//training data is an array of { text: '', classes: ['', '']}
const createClassifier = (name, training_data) => {

	const params = {
		language: 'en',
		name,
		training_data: training_data.map(entry => ({ classes: entry.classes, text: clean(entry.text) }))
	};

	return new Promise((resolve, reject) => {
		nlc.create(params, (err, res) => {
			if(err)
				return reject(err)
			resolve(res)
		})
	})

}



module.exports = {
	createClassifier,
	listClassifiers,
	listStatuses,
	classifierStatus,
	classify
}
