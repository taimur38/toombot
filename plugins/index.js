module.exports = [
	require('./reddit').onMessage,
    require('./sentiment').onMessage,
    require('./reddit-enrichment').onMessage,
    require('./image-tagging').onMessage
]
