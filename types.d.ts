export interface MinionModule {
	key: string,
	onMessage: (msg : any) => Iterator<Promise<Object>>,
	filter?: (msg : any) => boolean,
	requirements?: string[]
}

// it will either have generator field or init field. yes this makes no sense from this perspective
export interface ActiveMinion {
	generator?: Iterator<Promise<MinionResult>>,
	init?: (msg: any) => Iterator<Promise<MinionResult>>,
	requirements: string[],
	filter: (msg : any) => boolean,
	key: string,
	contextMatch: (msg : SlackMessage) => boolean
}

export interface MinionResult extends Object {
	filter?: (msg : any) => boolean,
	text?: string,
	send?: boolean,
	requirements?: string[],
	contextMatch?: (msg : SlackMessage) => boolean,
	threadReply?: boolean
}

export interface SlackResponse {
	type: string,
	channel: string,
	user: string,
	text: string,
	ts: string
}

export interface SlackMessage {
	id: string,
	text: string,
	user: SlackUser,
	mentions: SlackUser[],
	timestamp: Date,
	ts: number,
	thread_ts?: number,
	channel: SlackChannel
}

export interface SlackUser {
	name: string,
	id: string,
	profile: {
		email: string,
		image_original: string,
		image_512: string
	}
}

export interface SlackChannel {
	name: string,
	id: string
}
