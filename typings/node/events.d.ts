declare module 'events' {
	interface IEvents {
		EventEmitter: any;
	}

	const events: IEvents;

	export = events;
}