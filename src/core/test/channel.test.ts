import { AsyncChannel } from '../channel';

test('AsyncChannel with request id', async () => {
	const channel = new AsyncChannel();

	channel.push = jest.fn();
	const requestPayload = {};
	const promise = channel.request(requestPayload);

	expect(Object.values(channel.requestPool).length).toBe(1);
	expect(Object.values(channel.requestPool)[0].payload).toBe(requestPayload);
	expect(Object.values(channel.requestPool)[0].requestId).toBeTruthy();

	const requestContext = Object.values(channel.requestPool)[0];
	const { resolve } = requestContext;
	const response = { requestId: requestContext.requestId };
	resolve(response);

	expect(await promise).toBe(response);

	channel.stopCleaner();
});

test('AsyncChannel with error response', async () => {
	const channel = new AsyncChannel();

	channel.push = jest.fn();
	const requestPayload = {};
	const promise = channel.request(requestPayload);

	const requestContext = Object.values(channel.requestPool)[0];
	const { reject } = requestContext;
	reject('error');

	expect(async () => {
		await promise;
	}).rejects.toBe('error');

	channel.stopCleaner();
});

test('AsyncChannel with error response from trigger listener', async () => {
	const channel = new AsyncChannel();

	channel.push = jest.fn();
	const requestPayload = {};
	const promise = channel.request(requestPayload);

	const { payload } = Object.values(channel.requestPool)[0];
	channel.listener({
		requestId: payload.requestId,
		error: 'failed',
	});

	expect(async () => {
		await promise;
	}).rejects.toThrow('failed');

	channel.stopCleaner();
});

test('AsyncChannel with correct response from trigger listener', async () => {
	const channel = new AsyncChannel();

	channel.push = jest.fn();
	const requestPayload = {};
	const promise = channel.request<{ data: string }>(requestPayload);

	const { payload } = Object.values(channel.requestPool)[0];
	channel.listener({
		requestId: payload.requestId,
		data: 'hello world',
	});

	const res = await promise;
	expect(res.data).toBe('hello world');

	channel.stopCleaner();
});

test('AsyncChannel failed by exceed timeout', async () => {
	const channel = new AsyncChannel();

	channel.push = jest.fn();
	const requestPayload = {};
	const promise = channel.request<{ data: string }>(requestPayload, 0);

	expect(async () => {
		await promise;
	}).rejects.toThrow('Request timeout');

	channel.stopCleaner();
});

test('AsyncChannel request with push event implementation', async () => {
	const channel = new AsyncChannel();

	let count = 0;
	channel.push = () => {
		count++;
	};
	const requestPayload = {};
	const promise = channel.request<{ data: string }>(requestPayload, 0);

	expect(async () => {
		await promise;
	}).rejects.toThrow('Request timeout');

	expect(count).toBe(1);

	channel.stopCleaner();
});
