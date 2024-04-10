/* eslint-disable @typescript-eslint/no-unused-vars */

export class Kernel<
	PortKey extends string | number = string,
	EventKey extends string | number = string,
> {
	portsMap: Record<PortKey, Port<EventKey>> = {} as never;

	registerPort(key: PortKey, port: Port<EventKey>): this {
		if (!this.portsMap[key]) {
			this.portsMap[key] = port;
		}

		return this.port(key);
	}

	port(key: PortKey) {
		if (!this.portsMap[key]) {
			throw Error(`port with key ${key} is not registered`);
		}

		this.handle = this.registerEvent.bind(this, key);

		return this;
	}

	registerEvent(portKey: PortKey, eventKey: EventKey): this {
		if (!this.portsMap[portKey].eventsMap) {
			this.portsMap[portKey].eventsMap = {
				[eventKey]: { handlers: [] },
			} as never;

			this.use = this.registerMiddleware.bind(this, portKey, eventKey);
		}

		return this;
	}

	handle(event: EventKey): this {
		throw Error('"handle" must be used followed by "port" method');
	}

	registerMiddleware(
		portKey: PortKey,
		eventKey: EventKey,
		middleware: Middleware,
	): this {
		if (!this.portsMap[portKey].eventsMap[eventKey]) {
			this.portsMap[portKey].eventsMap[eventKey] = {
				handlers: [],
			};
		}

		this.portsMap[portKey].eventsMap[eventKey].handlers.push(middleware);

		return this;
	}

	use(middleware: Middleware): this {
		throw Error('"use" must be used followed by "handle" method');
	}
}

type Port<T extends string | number> = {
	eventsMap: Record<T, EventHandler>;
};

export type EventHandler = {
	handlers: Middleware[];
};

export type Middleware = () => void;
