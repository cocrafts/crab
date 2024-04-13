import type { RawRequest, Request, RequestContext, Response } from './types';

export interface Channel {
	request: <T>(payload: RawRequest, timeout: number) => Promise<T>;
}

export class AsyncChannel implements Channel {
	private timer: never | null = null;
	requestPool: Record<string, RequestContext> = {};

	constructor() {
		this.startCleaner();
	}

	async request<T>(
		request: RawRequest | (RawRequest & { id: string }),
		timeout: number = 1000,
	): Promise<T> {
		if (typeof request !== 'object') {
			throw Error("Payload must be 'object' type");
		} else if (request.id && this.requestPool[(request as Request).id]) {
			throw Error('Request id must be unique');
		} else if (!request.id) {
			request.id = crypto.randomUUID();
		}

		// passing timeout to kernel for timeout-aware communication
		this.push(Object.assign(request, { timeout }));

		return new Promise((resolve, reject) => {
			this.requestPool[request.id as string] = {
				requestId: request.id as string,
				payload: request as Request,
				resolve: resolve as RequestContext['resolve'],
				reject,
				timeout,
				sentAt: new Date(),
			};
		});
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	push(payload: RawRequest) {
		throw Error('Not implemented yet');
	}

	handleIncoming(response: Response) {
		if (typeof response !== 'object' || !response.requestId) {
			throw Error('got an invalid response');
		}

		if (!this.requestPool[response.requestId]) {
			throw Error(`can not find context of ${response.requestId} to resolve`);
		}

		const { resolve, reject } = this.requestPool[response.requestId];
		if (response.error) {
			reject(new Error(response.error));
		} else {
			resolve(response);
		}

		delete this.requestPool[response.requestId];
	}

	startCleaner(interval: number = 1000) {
		if (this.timer) throw Error('Cleaner is already running');

		this.timer = setInterval(() => {
			const now = new Date();
			for (const requestId in this.requestPool) {
				const duration =
					now.getTime() - this.requestPool[requestId].sentAt.getTime();

				if (duration > this.requestPool[requestId].timeout) {
					this.requestPool[requestId].reject(new Error('Request timeout'));
					delete this.requestPool[requestId];
				}
			}
		}, interval) as never;
	}

	stopCleaner() {
		clearInterval(this.timer as never);
	}
}
