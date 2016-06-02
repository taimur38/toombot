const Process = message => {

	if (!message.alchemy || (!message.alchemy.concepts && !message.alchemy.entities && !message.alchemy.keywords)) {
		return Promise.resolve({
			locations: []
		});
	}

  let temp = {};

  if(message.alchemy.concepts) {
    message.alchemy.concepts.forEach(concept => {
      if(concept.geo || (concept.knowledgeGraph && concept.knowledgeGraph.typeHierarchy.indexOf("/places/") > -1)) {
        temp[concept.text.toLowerCase()] = Math.max(temp[concept.text.toLowerCase()] || 0, concept.relevance);
      }
    });
  }

  if(message.alchemy.entities) {
    message.alchemy.entities.forEach(entity => {
      if(entity.geo || (entity.knowledgeGraph && entity.knowledgeGraph.typeHierarchy.indexOf("/places/") > -1)) {
        temp[entity.text.toLowerCase()] = Math.max(temp[entity.text.toLowerCase()] || 0, entity.relevance);
      }
    });
  }

  if(message.alchemy.keywords) {
    message.alchemy.keywords.forEach(keyword => {
      if(keyword.geo || (keyword.knowledgeGraph && keyword.knowledgeGraph.typeHierarchy.indexOf("/places/") > -1)) {
        temp[keyword.text.toLowerCase()] = Math.max(temp[keyword.text.toLowerCase()] || 0, keyword.relevance);
      }
    });
  }

  let locations = [];

  for (let key in temp) {
    if (temp.hasOwnProperty(key)) {
      locations.push({
        text: key,
        relevance: temp[key]
      });
    }
  }

	locations.sort((a, b) => b.relevance - a.relevance);

  return Promise.resolve({
    locations: locations
  });
}

module.exports = {
	Process,
	key: 'locations',
	requirements: ['alchemy']
}
