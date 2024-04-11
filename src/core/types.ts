export type Middleware<T> = (
	payload: Request<T>,
	respond: (payload: Response) => void,
	next?: (payload: Request<T>) => void,
) => Promise<void> | void;

export type RawRequest = Partial<Request>;

export type Request<T = string> = {
	requestId: string;
	type: T;
	/**
	 * timeout is always passed in the request,
	 * any timeout-aware middleware can use this one to prevent unexpected retrying/looping
	 */
	timeout: number;
} & Record<string, unknown>;

export type Response = {
	requestId: string;
	error?: string;
} & Record<string, unknown>;

export type RequestContext = {
	requestId: string;
	resolve: (response: Response) => void;
	reject: (error: Error | string) => void;
	timeout: number;
	sentAt: Date;
	payload: Request;
};
