import type { RawRequest } from 'core/channel';
import { AsyncChannel } from 'core/channel';

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
}
