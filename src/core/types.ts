// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Middleware<T, R = any> = (
	payload: Request<T> & R,
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

export type Response<T = Record<string, unknown>> = {
	requestId: string;
	error?: string;
} & T;

export type RequestContext = {
	requestId: string;
	resolve: (response: Response) => void;
	reject: (error: Error | string) => void;
	timeout: number;
	sentAt: Date;
	payload: Request;
};
