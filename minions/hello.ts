// must yield promises.
export function* onMessage(message : any) : Iterable<Promise<any>> {

	yield Promise.resolve({
		filter: (msg : any) : boolean => true,
		text: 'hello'
	})

	return Promise.resolve({
		text: "good"
	});
}

export const key = (msg : any) : string => `${msg.user.id}-hello`
export const requirements : string[] = [];
export const filter = (msg : any) : boolean => true
