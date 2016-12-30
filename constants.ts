export const alchemy_key = process.env.ALCHEMY_KEY;
export const alchemy_keys = JSON.parse(process.env.ALCHEMY_KEYS || "[]")
export const geniusToken = process.env.GENIUS_TOKEN;

const conceptInsights = {
	username: process.env.CONCEPT_INSIGHTS_USER,
	password: process.env.CONCEPT_INSIGHTS_PASS
};

export const relationshipExtraction = {
	username: process.env.REL_EXTRACT_USER,
	password: process.env.REL_EXTRACT_PASS
}

export const tone = {
	username: process.env.TONE_ANALYZER_USER,
	password: process.env.TONE_ANALYZER_PASS
};

export const googleApiKey = process.env.GOOGLE_API_KEY

export const wolframAppID = process.env.WOLFRAM_APP_ID

export const NLC = {
	username: process.env.NLC_USER,
	password: process.env.NLC_PASS
}

export const bot = {
	name: process.env.BOT_NAME
}

export const visualRecognitionAPIKey = process.env.VR_API_KEY;
