import type { Request } from '../core';
import { Kernel } from '../core/kernel';
import { MobileMessageBus } from './channel';

/**
 * Kernel implementation for mobile (React Native) runtime.
 *
 * Since mobile apps run in a single JavaScript context, this kernel
 * uses an in-memory message bus rather than IPC mechanisms.
 *
 * The API is identical to ChromeKernel and WebKernel for consistency.
 *
 * Usage:
 * ```typescript
 * const kernel = new MobileKernel();
 *
 * kernel
 *   .channel('WalletService')
 *   .handle('GetBalance')
 *   .use(async (request, respond) => {
 *     const balance = await getBalance();
 *     respond({ balance });
 *   })
 *   .run();
 * ```
 */
export class MobileKernel<
	ChannelId extends string = string,
	EventType extends string | number = string,
> extends Kernel<ChannelId, EventType> {
	private listeners = new Map<string, (message: any) => void>();

	run(cleanInterval?: number): void {
		super.run(cleanInterval);

		// Subscribe to all registered channels
		Object.keys(this.getChannelContext as any).forEach((channelId) => {
			this.subscribeToChannel(channelId as ChannelId);
		});
	}

	/**
	 * Subscribe to a specific channel
	 */
	private subscribeToChannel(channelId: ChannelId): void {
		// Prevent duplicate subscriptions
		if (this.listeners.has(channelId as string)) return;

		const listener = (message: any) => {
			// Build request from message
			const request: Request<EventType> = {
				id: message.id,
				type: message.type,
				timeout: message.timeout || 1000,
				...message,
				context: {
					channelId,
					from: message.from,
				},
			};

			// Execute middleware pipeline
			this.execute(channelId, request, (response) => {
				// Send response back via response channel
				const responseWithMetadata = {
					...response,
					to: message.from,
				};

				MobileMessageBus.post(
					message.responseChannel || `${channelId}:response`,
					responseWithMetadata
				);
			});
		};

		this.listeners.set(channelId as string, listener);
		MobileMessageBus.subscribe(channelId as string, listener);
	}

	/**
	 * Override channel registration to auto-subscribe
	 */
	channel(channelId: ChannelId): this {
		super.channel(channelId);

		// Auto-subscribe if kernel is already running
		if (this.listeners.size > 0) {
			this.subscribeToChannel(channelId);
		}

		return this;
	}

	/**
	 * Cleanup all listeners
	 */
	destroy(): void {
		this.listeners.forEach((listener, channelId) => {
			MobileMessageBus.unsubscribe(channelId, listener);
		});
		this.listeners.clear();
	}
}
