import type { Kernel } from './kernel';
import type { Middleware, Request } from './types';

export type CrossResolvingRequest<T> = Request<
	T,
	{
		resolveId: string;
		resolvePayload: unknown;
	}
>;

export const handleCrossResolving = <
	ChannelId extends string | number,
	EventType extends string | number,
>(
	kernel: Kernel<ChannelId, EventType>,
) => {
	return ((request, respond) => {
		const { resolveId } = request;
		const resolvingContext = kernel.crossResolvingContext[resolveId];
		if (!resolvingContext) {
			respond({ error: 'Can not find context for cross-resolving' });
		} else {
			const { resolve } = resolvingContext;
			resolve(request.resolvePayload);
			respond({});
		}
	}) as Middleware<EventType, CrossResolvingRequest<EventType>>;
};
