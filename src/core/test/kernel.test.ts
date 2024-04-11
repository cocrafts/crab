import { Kernel } from '../kernel';

enum ChannelId {
	App,
	SDK,
	Widget,
}

enum EventType {
	Greeting,
	Logging,
}

test('kernel with middlewares', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const decryptRequest = jest.fn();
	const handleGreetingFromApp = jest.fn();
	const handleLoggingFromApp = jest.fn();
	const handleGreetingFromSDK = jest.fn();
	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(decryptRequest)
		.use(handleGreetingFromApp)
		.handle(EventType.Logging)
		.use(decryptRequest)
		.use(handleLoggingFromApp)

		.channel(ChannelId.SDK)
		.handle(EventType.Greeting)
		.use(handleGreetingFromSDK);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Greeting].middlewares
			.length,
	).toBe(2);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Greeting]
			.middlewares[0],
	).toBe(decryptRequest);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Greeting]
			.middlewares[1],
	).toBe(handleGreetingFromApp);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Logging].middlewares
			.length,
	).toBe(2);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Logging]
			.middlewares[0],
	).toBe(decryptRequest);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Logging]
			.middlewares[1],
	).toBe(handleLoggingFromApp);

	expect(
		kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Greeting].middlewares
			.length,
	).toBe(1);

	expect(
		kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Greeting]
			.middlewares[0],
	).toBe(handleGreetingFromSDK);

	expect(kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Logging]).toBe(
		undefined,
	);

	expect(kernel.channelsMap[ChannelId.Widget]).toBe(undefined);
});
