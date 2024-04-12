import { Kernel } from '../core/kernel';

/**
 * Kernel implementation for web runtime with global `window`.
 *
 * We use a `from` field in the request payload as the `channelId`.
 * `to` field is used for filter out the response, because web runtime does not establish long-lived connection
 */
export class WebKernel<
	ChannelId extends string = string,
	EventType extends string | number = string,
> extends Kernel<ChannelId, EventType> {
	run(): void {
		super.run();
		window.addEventListener('message', (event) => {
			this.execute(event.data.from, event.data, (payload) => {
				payload.to = event.data.from;
				window.postMessage(payload);
			});
		});
	}
}
