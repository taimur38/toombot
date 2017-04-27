interface MinionModule {
	key: string,
	onMessage: (msg : any) => Iterator<Promise<Object>>,
	filter?: (msg : any) => boolean,
	requirements?: string[]
}

// it will either have generator field or init field. yes this makes no sense from this perspective
interface ActiveMinion {
	generator?: Iterator<Promise<MinionResult>>,
	init?: (msg: any) => Iterator<Promise<MinionResult>>,
	requirements: string[],
	filter: (msg : any) => boolean,
	key: string,
	contextMatch: (msg : SlackMessage) => boolean
}

interface MinionResult extends Object {
	filter?: (msg : any) => boolean,
	text?: string,
	send?: boolean,
	requirements?: string[],
	contextMatch?: (msg : SlackMessage) => boolean,
	threadReply?: boolean,
	channelOverride?: string
}

interface SlackResponse {
	type: string,
	channel: string,
	user: string,
	text: string,
	ts: string
}

interface SlackMessage {
	id: string,
	text: string,
	user: SlackUser,
	mentions: SlackUser[],
	timestamp: Date,
	ts: number,
	thread_ts?: number,
	channel: SlackChannel
}

interface SlackUser {
	name: string,
	id: string,
	profile: {
		email: string,
		image_original: string,
		image_512: string
	}
}

interface SlackChannel {
	name: string,
	id: string,
	members: string[],
	purpose: {
		value: string,
		creator: string,
		last_set: number
	},
	is_group: boolean,
	is_mpim: boolean
}
