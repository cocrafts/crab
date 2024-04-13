import { AsyncChannel } from '../channel';

test('AsyncChannel with request id', async () => {
	const channel = new AsyncChannel();

	channel.push = jest.fn();
	const request = { type: 'ping' };
	const promise = channel.request(request);

	expect(Object.values(channel.requestPool).length).toBe(1);
	expect(Object.values(channel.requestPool)[0].payload).toBe(request);
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
	const request = { type: 'ping' };
	const promise = channel.request(request);

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
	const request = { type: 'ping' };
	const promise = channel.request(request);

	const { requestId } = Object.values(channel.requestPool)[0];
	channel.handleIncoming({
		requestId: requestId,
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
	const request = { type: 'ping', message: 'hello world' };
	const promise = channel.request<{ data: string }>(request);

	const { payload } = Object.values(channel.requestPool)[0];
	channel.handleIncoming({
		requestId: payload.id,
		data: 'hello world',
	});

	const res = await promise;
	expect(res.data).toBe('hello world');

	channel.stopCleaner();
});

test('AsyncChannel failed by exceed timeout', async () => {
	const channel = new AsyncChannel();

	channel.push = jest.fn();
	const request = { type: 'ping' };
	const promise = channel.request<{ data: string }>(request, 0);

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
	const request = { type: 'ping' };
	const promise = channel.request<{ data: string }>(request, 0);

	expect(async () => {
		await promise;
	}).rejects.toThrow('Request timeout');

	expect(count).toBe(1);

	channel.stopCleaner();
});
