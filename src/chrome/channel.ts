import { AsyncChannel } from '../core/channel';
import type { RawRequest, Request } from '../core/types';

export class ChromeChannel extends AsyncChannel {
	connection: chrome.runtime.Port;

	constructor(channelId: string) {
		super();
		this.connection = chrome.runtime.connect({ name: channelId });
		this.connection.onMessage.addListener((message) => {
			this.handleIncoming(message);
		});
	}

	push(payload: RawRequest): void {
		this.connection.postMessage(payload);
	}

	request<T>(payload: Partial<Request<string>>, timeout?: number): Promise<T> {
		return super.request(payload, timeout);
	}
}
