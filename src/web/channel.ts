import { AsyncChannel } from '../core/channel';
import type { RawRequest } from '../core/types';

export class WebChannel extends AsyncChannel {
	channelId: string;

	constructor(channelId: string) {
		super();
		this.channelId = channelId;
		window.addEventListener('message', (event) => {
			if (event.data.to !== this.channelId) return;
			this.handleIncoming(event.data);
		});
	}

	push(payload: RawRequest): void {
		payload.from = this.channelId;
		window.postMessage(payload);
	}
}
