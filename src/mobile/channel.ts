import { AsyncChannel } from '../core/channel';
import type { RawRequest, Response } from '../core/types';

/**
 * Mobile channel using in-memory message bus.
 *
 * Since mobile apps (React Native) run in a single JavaScript context,
 * we use a simple event-based system rather than complex IPC.
 *
 * This is essentially a "virtual" channel that simulates async messaging
 * for API consistency with Chrome/Web implementations.
 */

// Global message bus for mobile
class MessageBus {
	private listeners = new Map<string, Set<(message: any) => void>>();

	subscribe(channelId: string, listener: (message: any) => void): void {
		if (!this.listeners.has(channelId)) {
			this.listeners.set(channelId, new Set());
		}
		this.listeners.get(channelId)!.add(listener);
	}

	unsubscribe(channelId: string, listener: (message: any) => void): void {
		this.listeners.get(channelId)?.delete(listener);
	}

	post(channelId: string, message: any): void {
		// Use setImmediate/setTimeout to make it async (simulate IPC)
		const emit = () => {
			const listeners = this.listeners.get(channelId);
			if (listeners) {
				listeners.forEach((listener) => {
					try {
						listener(message);
					} catch (error) {
						console.error('[MessageBus] Listener error:', error);
					}
				});
			}
		};

		if (typeof setImmediate !== 'undefined') {
			setImmediate(emit);
		} else {
			setTimeout(emit, 0);
		}
	}

	clear(): void {
		this.listeners.clear();
	}
}

// Singleton message bus
const messageBus = new MessageBus();

export interface MobileChannelConfig {
	/**
	 * Auto-cleanup when channel is no longer referenced
	 * @default true
	 */
	autoCleanup?: boolean;
}

/**
 * Mobile channel using pure Promise-based in-memory messaging.
 *
 * Usage:
 * ```typescript
 * // Component A
 * const channel = new MobileChannel('WalletService');
 * const result = await channel.request({ type: 'GetBalance' });
 *
 * // Component B (or service)
 * const kernel = new MobileKernel();
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
export class MobileChannel extends AsyncChannel {
	private channelId: string;
	private responseChannelId: string;
	private config: MobileChannelConfig;
	private listener: (message: any) => void;
	private _isConnected = false;

	constructor(channelId: string, config: MobileChannelConfig = {}) {
		super();
		this.channelId = channelId;
		this.responseChannelId = `${channelId}:response`;
		this.config = {
			autoCleanup: true,
			...config,
		};

		// Setup response listener
		this.listener = (message: Response) => {
			this.handleIncoming(message);
		};

		messageBus.subscribe(this.responseChannelId, this.listener);
		this._isConnected = true;
	}

	push(payload: RawRequest): void {
		if (!this._isConnected) {
			console.warn('[MobileChannel] Attempting to send on disconnected channel');
			return;
		}

		// Add channel metadata
		const messageWithMetadata = {
			...payload,
			from: this.channelId,
			responseChannel: this.responseChannelId,
		};

		// Post to kernel's channel
		messageBus.post(this.channelId, messageWithMetadata);
	}

	/**
	 * Check if channel is connected
	 */
	isConnected(): boolean {
		return this._isConnected;
	}

	/**
	 * Disconnect and cleanup
	 */
	disconnect(): void {
		if (!this._isConnected) return;

		this._isConnected = false;
		messageBus.unsubscribe(this.responseChannelId, this.listener);

		// Reject all pending requests
		Object.values(this.requestPool).forEach(({ reject }) => {
			reject(new Error('Channel disconnected'));
		});
		this.requestPool = {};
	}

	/**
	 * Cleanup on garbage collection (if supported)
	 */
	// @ts-ignore - FinalizationRegistry is not in all TS versions
	private static registry = typeof FinalizationRegistry !== 'undefined'
		? new FinalizationRegistry((channelId: string) => {
				console.log('[MobileChannel] Auto-cleanup for:', channelId);
		  })
		: null;
}

/**
 * Export message bus for advanced use cases
 */
export { messageBus as MobileMessageBus };
