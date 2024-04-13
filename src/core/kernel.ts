import type {
	KernelRequestContext,
	Middleware,
	RawResponse,
	Request,
} from './types';

/**
 * Base implementation of kernel for registering and managing handlers (middlewares) of channel-event pair.
 * Do not directly use this class.
 *
 * For a specific runtime, you need to override the `run` method to bootstrap the kernel.
 * The `run` method must link incoming channel request to pre-registered handlers via calling `execute`.
 */
export class Kernel<
	ChannelId extends string | number = string,
	EventType extends string | number = string,
> {
	/**
	 * This request pool supports cross-resolving requests
	 * and detects unresolved the final middleware (dangling middleware)
	 */
	private requestPool: Record<string, KernelRequestContext<EventType>> = {};
	private timer: never | null = null;
	private crossResolvingContext: Record<
		string,
		{
			requestId: string;
			resolve: (value: unknown) => void;
			reject: (error: Error | string) => void;
		}
	> = {};
	private channelsMap: Record<ChannelId, ChannelContext<EventType>> =
		{} as never;
	private firstMiddlewares: Middleware<EventType>[] = [];

	getChannelContext(channelId: ChannelId): ChannelContext<EventType> {
		return this.channelsMap[channelId];
	}

	getMiddlewares(channelId: ChannelId, eventType: EventType): Middleware[] {
		return this.channelsMap[channelId].eventsMap[eventType].middlewares;
	}

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
	run(cleanInterval?: number) {
		this.startCleaner(cleanInterval);
		// deepFreeze(this);
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
	async execute(
		channelId: ChannelId,
		request: Request<EventType>,
		respond: (payload: RawResponse) => void,
	) {
		const respondWithResolving = (response: RawResponse) => {
			if (!this.requestPool[request.id]) {
				throw Error('This request has already been resolved');
			} else {
				delete this.requestPool[request.id];
			}

			const responseWithRequestId = Object.assign(response, {
				requestId: request.id,
			});
			respond(responseWithRequestId);
		};

		const defaultTimeout = 1000;
		this.requestPool[request.id] = {
			request,
			receivedAt: new Date(),
			// do I need to setTimeout to automatically clean it up?
			timeout: request.timeout || defaultTimeout,
			respondWithResolving,
		};

		if (!this.channelsMap[channelId]) {
			respondWithResolving({ error: `Unsupported channel '${channelId}'` });
			return;
		} else if (!this.channelsMap[channelId].eventsMap[request.type]) {
			respondWithResolving({ error: `Unsupported event '${request.type}'` });
			return;
		}

		const middlewares =
			this.channelsMap[channelId].eventsMap[request.type].middlewares;
		if (!middlewares || middlewares.length === 0) {
			respondWithResolving({
				error: `Unsupported event '${request.type}' from channel '${channelId}'`,
			});
			return;
		}

		const execute = async (
			request: Request<EventType>,
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
				await currentMiddleware(request, respondWithResolving, next);

				const isUnresolvedFinal =
					restMiddlewares.length === 0 && this.requestPool[request.id];

				/**
				 * Responsing if the last middleware has done and the request is not resolved,
				 */
				if (isUnresolvedFinal) {
					respondWithResolving({ error: 'Can not resolve this request' });
				}
			} catch (error) {
				if (!this.requestPool[request.id]) {
					// there is problem in async testing, it throw an unexpected error about timeout
					return;
				}

				respondWithResolving({
					error: error instanceof Error ? error.message : (error as string),
				});
			}
		};

		await execute(request, middlewares);
	}

	createCrossResolvingRequest(requestId: string, timeout: number = 1000) {
		const resolveId = crypto.randomUUID();

		const resolve = async <T>() => {
			return new Promise((resolve, reject) => {
				const timerId = setTimeout(() => {
					reject(new Error(`Cross-resolving timeout`));
					delete this.crossResolvingContext[resolveId];
				}, timeout);

				this.crossResolvingContext[resolveId] = {
					requestId,
					resolve: (value) => {
						resolve(value);
						clearTimeout(timerId);
						delete this.crossResolvingContext[resolveId];
					},
					reject: (value) => {
						reject(value);
						clearTimeout(timerId);
						delete this.crossResolvingContext[resolveId];
					},
				};
			}) as T;
		};

		return { resolveId, resolve };
	}

	private startCleaner(interval: number = 1000) {
		if (this.timer) throw Error('Cleaner is already running');

		this.timer = setInterval(() => {
			const now = new Date();
			for (const requestId in this.requestPool) {
				const duration =
					now.getTime() - this.requestPool[requestId].receivedAt.getTime();

				if (duration > this.requestPool[requestId].timeout) {
					this.requestPool[requestId].respondWithResolving({
						error: "Request timeout, can't resolve this request",
					});

					this.cleanAllCrossResolvingContextOfRequest(requestId);
				}
			}
		}, interval) as never;
	}

	private cleanAllCrossResolvingContextOfRequest(requestId: string) {
		Object.entries(this.crossResolvingContext).forEach(([key, value]) => {
			if (value.requestId === requestId) {
				delete this.crossResolvingContext[key];
			}
		});
	}

	/**
	 * ignore for now
	 */
	private stopCleaner() {
		clearInterval(this.timer as never);
	}

	handleCrossResolvingMiddleware: Middleware = (request, respond) => {
		const { resolveId } = request;
		if (!resolveId) {
			respond({ error: 'Can not find resolveId in request' });
			return;
		}

		const resolvingContext = this.crossResolvingContext[resolveId];
		if (!resolvingContext) {
			respond({ error: 'Can not find context for cross-resolving' });
		} else {
			const { resolve } = resolvingContext;
			resolve(request);
			respond({ message: 'ok' });
		}
	};
}

export type ChannelContext<EventType extends string | number> = {
	eventsMap: Record<EventType, EventHandlersContext<EventType>>;
	firstMiddlewares: Middleware<EventType>[];
};

export type EventHandlersContext<EventType extends string | number> = {
	middlewares: Middleware<EventType>[];
};
