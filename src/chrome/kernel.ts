import { Kernel } from '../core/kernel';

/**
 * Kernel implementation for chrome extension runtime.
 *
 * This kernel can be used either in background and popup (extension pages),
 * but it's more suitable for background because of needing long-lived connection.
 * For now, we only support long-lived connection because of timeout needed,
 * native one-time request lacks of timeout support
 *
 * for `channelId`, we use `port` name from initializing connection with `chrome.connect`
 */
export class ChromeKernel<
	ChannelId extends string = string,
	EventType extends string | number = string,
> extends Kernel<ChannelId, EventType> {
	run(): void {
		super.run();
		chrome.runtime.onConnect.addListener((port) => {
			const channelId = port.name as ChannelId;
			port.onMessage.addListener((message, port) => {
				if (!message.sender) {
					message['sender'] = port.sender;
				}
				this.execute(channelId, message, (payload) => {
					port.postMessage(payload);
				});
			});
		});
	}
}
