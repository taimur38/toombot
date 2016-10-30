export interface MinionModule {
	key: (msg : any) => string,
	onMessage: (msg : any) => Iterator<Promise<Object>>,
	filter: (msg : any) => boolean,
	requirements: string[]
}

export interface ActiveMinion {
	generator: Iterator<Promise<Object>>,
	requirements: string[],
	filter: (msg : any) => boolean,
	key: string
}
