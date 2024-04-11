import { deepFreeze } from './utils';

/**
 * Base implementation of kernel for registering and managing handlers (middlewares) of port-event pairs.
 * Do not directly use this class.
 *
 * For a specific runtime, you need to override the `run` method to bootstrap the kernel.
 * The `run` method must link incoming channel request to pre-registered handlers via calling `execute`.
 *
 * Important: remember to call `super.run()` to prevent overwriting from request handling
 */
export class Kernel<
	ChannelId extends string | number = string,
	EventType extends string | number = string,
> {
	channelsMap: Record<
		ChannelId,
		{
			eventsMap: Record<
				EventType,
				{
					middlewares: Middleware<EventType>[];
				}
			>;
		}
	> = {} as never;

	/**
	 * Directly register a channel
	 */
	channel(channelId: ChannelId) {
		if (!this.channelsMap[channelId]) {
			this.channelsMap[channelId] = { eventsMap: {} as never };
		}

		this.handle = this.registerEvent.bind(this, channelId);

		return this;
	}

	/**
	 * Directly add supporting an event for a channel
	 */
	registerEvent(channelId: ChannelId, eventType: EventType): this {
		if (!this.channelsMap[channelId].eventsMap[eventType]) {
			this.channelsMap[channelId].eventsMap[eventType] = { middlewares: [] };
			this.use = this.registerMiddleware.bind(this, channelId, eventType);
		}

		return this;
	}

	/**
	 * Add supporting an event for a channel from pipeline
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	handle(eventType: EventType): this {
		throw Error('"handle" must be used followed by "port" method');
	}

	/**
	 * Directly register a middleware for event-channel pair
	 */
	registerMiddleware(
		channelId: ChannelId,
		eventType: EventType,
		middleware: Middleware<EventType>,
	): this {
		this.channelsMap[channelId].eventsMap[eventType].middlewares.push(
			middleware,
		);

		return this;
	}

	/**
	 * Register a middleware for event-channel pair from pipline
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	use(middleware: Middleware<EventType>): this {
		throw Error('"use" must be used followed by "handle" method');
	}

	run() {
		/**
		 * prevent overwriting from request handling
		 */
		deepFreeze(this);
	}

	/**
	 * Execute a request for a specified channel
	 */
	execute(
		channelId: ChannelId,
		payload: RequestPayload<EventType>,
		respond: (payload: unknown) => void,
	) {
		const middlewares =
			this.channelsMap[channelId].eventsMap[payload.type].middlewares;
		if (!middlewares || middlewares.length === 0)
			throw Error(
				`No middleware provided to handle event: ${payload.type} for port: ${channelId}`,
			);

		const execute = async (
			payload: RequestPayload<EventType>,
			middlewares: Middleware<EventType>[],
		) => {
			const [currentMiddleware, ...restMiddlewares] = middlewares;

			let next;
			if (restMiddlewares.length > 0) {
				next = (payload: RequestPayload<EventType>) => {
					execute(payload, restMiddlewares);
				};
			}

			try {
				await currentMiddleware(payload, respond, next);
			} catch (error) {
				respond({ error });
			}
		};

		execute(payload, middlewares);
	}
}

export type Middleware<T> = (
	payload: RequestPayload<T>,
	respond: (payload: unknown) => void,
	next?: (payload: RequestPayload<T>) => void,
) => Promise<void> | void;

export type RequestPayload<T> = { type: T };
