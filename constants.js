const alchemy_key = process.env.ALCHEMY_KEY;
const alchemy_keys = JSON.parse(process.env.ALCHEMY_KEYS || "[]")
const geniusToken = process.env.GENIUS_TOKEN;

const conceptInsights = {
	username: process.env.CONCEPT_INSIGHTS_USER,
	password: process.env.CONCEPT_INSIGHTS_PASS
};

const relationshipExtraction = {
    username: process.env.REL_EXTRACT_USER,
    password: process.env.REL_EXTRACT_PASS
}

const tone = {
    username: process.env.TONE_ANALYZER_USER,
    password: process.env.TONE_ANALYZER_PASS
};

module.exports = {
    alchemy_key,
    alchemy_keys,
	conceptInsights,
	relationshipExtraction,
	tone,
    geniusToken
}
