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
	const handleRequestPayload: Middleware<EventType> = (_, respond) => {
		respond({ message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(handleRequestPayload);

	const request = {
		id: crypto.randomUUID(),
		type: EventType.Greeting,
		timeout: 1000,
	};

	kernel.execute(ChannelId.App, request, (payload) => {
		expect(payload.message).toEqual('hello');
	});
});

test('kernel with execute payload with next in middleware', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const checkPayload: Middleware<EventType> = (request, _respond, next) => {
		next?.({ ...request, checked: true });
	};

	const handleRequestPayload: Middleware<EventType> = (request, respond) => {
		expect(request.checked).toBeTruthy();
		respond({ message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(checkPayload)
		.use(handleRequestPayload);

	const request = {
		id: crypto.randomUUID(),
		type: EventType.Greeting,
		timeout: 1000,
	};

	kernel.execute(ChannelId.App, request, (response) => {
		expect(response.message).toEqual('hello');
		expect(response.requestId).toEqual(request.id);
	});
});

test('kernel with execute payload with error in middleware', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const checkPayload: Middleware<EventType> = async () => {
		throw Error('Something went wrong');
	};

	const handleRequestPayload: Middleware<EventType> = (request, respond) => {
		expect(request.checked).toBeTruthy();
		respond({ message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(checkPayload)
		.use(handleRequestPayload);

	const request = {
		id: crypto.randomUUID(),
		type: EventType.Greeting,
		timeout: 1000,
	};

	kernel.execute(ChannelId.App, request, (response) => {
		expect(response.error).toEqual('Something went wrong');
	});
});

test('kernel with execute payload with no response', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const checkPayload: Middleware<EventType> = async () => {};

	const handleRequestPayload: Middleware<EventType> = (request, respond) => {
		expect(request.checked).toBeTruthy();
		respond({ message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(checkPayload)
		.use(handleRequestPayload);

	const request = {
		id: crypto.randomUUID(),
		type: EventType.Greeting,
		timeout: 1000,
	};

	let count = 0;
	kernel.execute(ChannelId.App, request, () => {
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
		respond({ message: 'hello' });
	};

	kernel
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(checkPayload)
		.use(handleRequestPayload);

	const request = {
		id: crypto.randomUUID(),
		type: 'WrongEventType' as never,
		timeout: 1000,
	};

	expect(() => {
		kernel.execute(ChannelId.App, request, () => {});
	}).toThrow();
});

test('kernel with first middlewares', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const decryptRequest = jest.fn();
	const handleGreetingFromApp = jest.fn();
	const handleLoggingFromApp = jest.fn();
	const handleGreetingFromSDK = jest.fn();
	kernel
		.use(decryptRequest)

		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(handleGreetingFromApp)
		.handle(EventType.Logging)
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
	).toBe(2);

	expect(
		kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Greeting]
			.middlewares[0],
	).toBe(decryptRequest);

	expect(
		kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Greeting]
			.middlewares[1],
	).toBe(handleGreetingFromSDK);

	expect(kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Logging]).toBe(
		undefined,
	);

	expect(kernel.channelsMap[ChannelId.Widget]).toBe(undefined);
});

test('kernel with last middlewares', () => {
	const kernel = new Kernel<ChannelId, EventType>();
	const decryptRequest = jest.fn();
	const encryptResponse = jest.fn();
	const notify = jest.fn();
	const handleGreetingFromApp = jest.fn();
	const handleGreetingFromSDK = jest.fn();
	kernel
		.use(decryptRequest)
		.channel(ChannelId.App)
		.handle(EventType.Greeting)
		.use(handleGreetingFromApp)
		.channel(ChannelId.SDK)
		.handle(EventType.Greeting)
		.use(handleGreetingFromSDK)
		.unwrap()
		.use(encryptResponse)
		.use(notify);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Greeting].middlewares
			.length,
	).toBe(4);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Greeting]
			.middlewares[0],
	).toBe(decryptRequest);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Greeting]
			.middlewares[1],
	).toBe(handleGreetingFromApp);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Greeting]
			.middlewares[2],
	).toBe(encryptResponse);

	expect(
		kernel.channelsMap[ChannelId.App].eventsMap[EventType.Greeting]
			.middlewares[3],
	).toBe(notify);

	expect(
		kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Greeting].middlewares
			.length,
	).toBe(4);

	expect(
		kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Greeting]
			.middlewares[0],
	).toBe(decryptRequest);

	expect(
		kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Greeting]
			.middlewares[1],
	).toBe(handleGreetingFromSDK);

	expect(
		kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Greeting]
			.middlewares[2],
	).toBe(encryptResponse);

	expect(
		kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Greeting]
			.middlewares[3],
	).toBe(notify);

	expect(kernel.channelsMap[ChannelId.SDK].eventsMap[EventType.Logging]).toBe(
		undefined,
	);

	expect(kernel.channelsMap[ChannelId.Widget]).toBe(undefined);
});
