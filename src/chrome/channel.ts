import { AsyncChannel } from '../core/channel';
import type { RawRequest } from '../core/types';

type ChromeChannelConfigs = {
	/**
	 * use autoReconnect will listen to disconnect event and pageshow from bfcache to reconnect to the kernel
	 */
	autoReconnect?: boolean;
};

export class ChromeChannel extends AsyncChannel {
	connection: chrome.runtime.Port;

	constructor(channelId: string, configs?: ChromeChannelConfigs) {
		super();
		this.connection = this.connect(channelId, configs?.autoReconnect);

		if (configs?.autoReconnect) {
			window?.addEventListener('pageshow', (event) => {
				if (event.persisted) {
					console.warn('Page restored from bfcache, reconnect');
					this.connection = this.connect(channelId, configs.autoReconnect);
				}
			});
		}
	}

	private connect(
		channelId: string,
		autoReconnect?: boolean,
	): chrome.runtime.Port {
		const connection = chrome.runtime.connect({ name: channelId });
		connection.onMessage.addListener((message) => {
			this.handleIncoming(message);
		});

		if (autoReconnect) {
			connection.onDisconnect.addListener(() => {
				console.warn('Port disconnected, attempting to reconnect...');
				this.connection = this.connect(channelId, autoReconnect);
			});
		}

		return connection;
	}

	push(payload: RawRequest): void {
		this.connection.postMessage(payload);
	}
}
