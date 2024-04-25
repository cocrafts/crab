// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Middleware<EventType = any, RequestPayload = any> = (
	request: Request<EventType, RequestPayload>,
	respond: (response: RawResponse) => void,
	next?: (request: Request<EventType, RequestPayload>) => void,
) => Promise<void> | void;

export type RawRequest<Type = string, Payload = Record<string, unknown>> = {
	type: Type;
} & Payload;

export type Request<Type = string, Payload = Record<string, unknown>> = {
	id: string;
	/**
	 * timeout is always passed in the request,
	 * any timeout-aware middleware can use this one to prevent unexpected retrying/looping
	 */
	timeout: number;
} & RawRequest<Type, Payload>;

export type RawResponse<Payload = Record<string, unknown>> = {
	error?: string;
} & Payload;

export type Response<Payload = Record<string, unknown>> = {
	requestId: string;
} & RawResponse<Payload>;

export type RequestContext = {
	requestId: string;
	resolve: (response: RawResponse) => void;
	reject: (error: Error | string) => void;
	timeout: number;
	sentAt: Date;
	payload: Request;
};

export type KernelRequestContext<EventType = string> = {
	channelId: string | number;
	timeout: number;
	request: Request<EventType>;
	receivedAt: Date;
	respondWithResolving: (response: RawResponse) => void;
};
