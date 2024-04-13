import type { Kernel } from './kernel';
import type { Middleware, Request } from './types';

export type CrossResolvingRequest<T> = Request<T, { resolveId: string }>;

export const handleCrossResolving = <
	ChannelId extends string | number,
	EventType extends string | number,
>(
	kernel: Kernel<ChannelId, EventType>,
) => {
	return ((request, respond) => {
		const { resolveId } = request;
		if (!resolveId) {
			respond({ error: 'Can not find resolveId in request' });
			return;
		}

		const resolvingContext = kernel.crossResolvingContext[resolveId];
		if (!resolvingContext) {
			respond({ error: 'Can not find context for cross-resolving' });
		} else {
			const { resolve } = resolvingContext;
			resolve(request);
			respond({ message: 'ok' });
		}
	}) as Middleware<EventType, CrossResolvingRequest<EventType>>;
};
