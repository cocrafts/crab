import { Kernel } from '../kernel';
import type { Middleware } from '../types';

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

test('kernel with execute payload', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const handleRequestPayload: Middleware<EventType> = (payload, respond) => {
		respond({ requestId: payload.requestId, message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(handleRequestPayload);

	const requestPayload = {
		requestId: crypto.randomUUID(),
		type: EventType.Greeting,
		timeout: 1000,
	};

	kernel.execute(ChannelId.App, requestPayload, (payload) => {
		expect(payload.message).toEqual('hello');
	});
});

test('kernel with execute payload with next in middleware', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const checkPayload: Middleware<EventType> = (payload, _respond, next) => {
		next?.({ ...payload, checked: true });
	};

	const handleRequestPayload: Middleware<EventType> = (payload, respond) => {
		expect(payload.checked).toBeTruthy();
		respond({ requestId: payload.requestId, message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(checkPayload)
		.use(handleRequestPayload);

	const requestPayload = {
		requestId: crypto.randomUUID(),
		type: EventType.Greeting,
		timeout: 1000,
	};

	kernel.execute(ChannelId.App, requestPayload, (payload) => {
		expect(payload.message).toEqual('hello');
		expect(payload.requestId).toEqual(requestPayload.requestId);
	});
});

test('kernel with execute payload with error in middleware', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const checkPayload: Middleware<EventType> = async () => {
		throw Error('Something went wrong');
	};

	const handleRequestPayload: Middleware<EventType> = (payload, respond) => {
		expect(payload.checked).toBeTruthy();
		respond({ requestId: payload.requestId, message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(checkPayload)
		.use(handleRequestPayload);

	const requestPayload = {
		requestId: crypto.randomUUID(),
		type: EventType.Greeting,
		timeout: 1000,
	};

	kernel.execute(ChannelId.App, requestPayload, (payload) => {
		expect(payload.error).toEqual('Something went wrong');
	});
});

test('kernel with execute payload with no response', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const checkPayload: Middleware<EventType> = async () => {};

	const handleRequestPayload: Middleware<EventType> = (payload, respond) => {
		expect(payload.checked).toBeTruthy();
		respond({ requestId: payload.requestId, message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(checkPayload)
		.use(handleRequestPayload);

	const requestPayload = {
		requestId: crypto.randomUUID(),
		type: EventType.Greeting,
		timeout: 1000,
	};

	let count = 0;
	kernel.execute(ChannelId.App, requestPayload, () => {
		count++;
	});

	expect(count).toBe(0);
});

test('kernel with failed payload with wrong event type', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const checkPayload: Middleware<EventType> = async () => {};

	const handleRequestPayload: Middleware<EventType, { checked: boolean }> = (
		payload,
		respond,
	) => {
		expect(payload.checked).toBeTruthy();
		respond({ requestId: payload.requestId, message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(checkPayload)
		.use(handleRequestPayload);

	const requestPayload = {
		requestId: crypto.randomUUID(),
		type: 'WrongEventType' as never,
		timeout: 1000,
	};

	expect(() => {
		kernel.execute(ChannelId.App, requestPayload, () => {});
	}).toThrow();
});
