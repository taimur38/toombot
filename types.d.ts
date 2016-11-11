export interface MinionModule {
	key: string,
	onMessage: (msg : any) => Iterator<Promise<Object>>,
	filter?: (msg : any) => boolean,
	requirements?: string[]
}

// it will either have generator field or init field. yes this makes no sense from this perspective
export interface ActiveMinion {
	generator?: Iterator<Promise<Object>>,
	init?: (msg: any) => Iterator<Promise<Object>>,
	requirements: string[],
	filter: (msg : any) => boolean,
	key: string,
	contextMatch: (msg : SlackMessage) => boolean
}

export interface MinionResult {
	filter?: (msg : any) => boolean,
	text?: string,
	send?: boolean,
	requirements?: string[],
	contextMatch?: (msg : SlackMessage) => boolean
}

export interface SlackMessage {
	id: string,
	text: string,
	user: SlackUser,
	mentions: SlackUser[],
	timestamp: Date,
	ts: number,
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
