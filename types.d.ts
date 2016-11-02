export interface MinionModule {
	key: (msg : any) => string,
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
	key: string
}

export interface MinionResult {
	filter?: (msg : any) => boolean,
	text?: string,
	send?: boolean,
	requirements?: string[]
}

export interface SlackMessage {
	id: string,
	text: string,
	user: SlackUser,
	mentions: SlackUser[],
	timestamp: Date,
	channel: SlackChannel
}

export interface SlackUser {
	name: string,
	id: string,
	email?: string
}

export interface SlackChannel {
	name: string,
	id: string
}
