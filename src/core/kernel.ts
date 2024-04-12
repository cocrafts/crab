import type { Middleware, Request, Response } from './types';
import { deepFreeze } from './utils';

/**
 * Base implementation of kernel for registering and managing handlers (middlewares) of channel-event pair.
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
	channelsMap: Record<ChannelId, ChannelContext<EventType>> = {} as never;
	firstMiddlewares: Middleware<EventType>[] = [];

	/**
	 * Directly register a channel
	 */
	channel(channelId: ChannelId) {
		if (!this.channelsMap[channelId]) {
			this.channelsMap[channelId] = {
				eventsMap: {} as never,
				firstMiddlewares: [],
			};
		}

		this.handle = this.registerEvent.bind(this, channelId);

		return this;
	}

	/**
	 * Add supporting an event for a channel from pipeline
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	handle(eventType: EventType): this {
		throw Error('"handle" must be used followed by "channel" method');
	}

	/**
	 * Register a middleware for event-channel pair from pipline, overided by pipeline
	 * Or register first middlewares of last middlewares if it's not in a pipeline or unwrapped
	 */
	use(middleware: Middleware<EventType>): this {
		return this.registerFirstOrLastMiddleware(middleware);
	}

	/**
	 * Remove current pipeline for freshing things
	 */
	unwrap(): this {
		this.use = this.registerFirstOrLastMiddleware;
		this.handle = () => {
			throw Error('"handle" is unwrapped, call a channel first');
		};

		return this;
	}

	/**
	 * This method need to be implemented by specific runtime.
	 * It's used to bootstrap the kernel
	 */
	run() {
		deepFreeze(this);
	}

	/**
	 * Directly add supporting an event for a channel
	 */
	registerEvent(channelId: ChannelId, eventType: EventType): this {
		const isNotInitializedChannelEventPair =
			this.channelsMap[channelId].eventsMap[eventType];
		if (!isNotInitializedChannelEventPair) {
			this.channelsMap[channelId].eventsMap[eventType] = {
				middlewares: [...this.firstMiddlewares],
			};

			this.use = this.registerMiddleware.bind(this, channelId, eventType);
		}

		return this;
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
	 * Register first or last middleware, only used if it's not in a pipeline or unwrapped.
	 *
	 * Register first middleware happens only if the channels map is not initialized or the event handler map is not initialized.
	 * For existed channel-event pair, append to the middlewares
	 */
	private registerFirstOrLastMiddleware(
		middleware: Middleware<EventType>,
	): this {
		const channels = Object.values<ChannelContext<EventType>>(this.channelsMap);
		const isNotInitialized = channels.length === 0;
		if (isNotInitialized) {
			this.firstMiddlewares.push(middleware);
		} else {
			channels.forEach((channel) => {
				const eventHandlers = Object.values<EventHandlersContext<EventType>>(
					channel.eventsMap,
				);

				const isNotInitializedChannelEventPair = eventHandlers.length === 0;
				if (isNotInitializedChannelEventPair) {
					channel.firstMiddlewares.push(middleware);
				} else {
					eventHandlers.forEach((eventHandler) => {
						eventHandler.middlewares.push(middleware);
					});
				}
			});
		}

		return this;
	}

	/**
	 * Execute a request for a specified channel
	 */
	execute(
		channelId: ChannelId,
		payload: Request<EventType>,
		respond: (payload: Response) => void,
	) {
		if (!this.channelsMap[channelId]) {
			throw Error('No channel registering found with id: ' + channelId);
		} else if (!this.channelsMap[channelId].eventsMap[payload.type]) {
			throw Error('No event registered with type: ' + payload.type);
		}

		const middlewares =
			this.channelsMap[channelId].eventsMap[payload.type].middlewares;
		if (!middlewares || middlewares.length === 0)
			throw Error(
				`No middleware provided to handle
				 event: ${payload.type} for port: ${channelId}`,
			);

		const execute = async (
			payload: Request<EventType>,
			middlewares: Middleware<EventType>[],
		) => {
			const [currentMiddleware, ...restMiddlewares] = middlewares;

			let next;
			if (restMiddlewares.length > 0) {
				next = (payload: Request<EventType>) => {
					execute(payload, restMiddlewares);
				};
			}

			try {
				await currentMiddleware(payload, respond, next);
			} catch (error) {
				respond({
					requestId: payload.requestId,
					error: error instanceof Error ? error.message : (error as string),
				});
			}
		};

		execute(payload, middlewares);
	}
}

export type ChannelContext<EventType extends string | number> = {
	eventsMap: Record<EventType, EventHandlersContext<EventType>>;
	firstMiddlewares: Middleware<EventType>[];
};

export type EventHandlersContext<EventType extends string | number> = {
	middlewares: Middleware<EventType>[];
};
