import type { Kernel, Middleware, RawRequest } from '@metacraft/crab/core';

export enum Channels {
	App = 'App',
	Popup = 'Popup',
	ContentScript = 'ContentScript',
	Kernel = 'Kernel',
}

export enum Events {
	Greeting = 'Greeting',
	RequestAction = 'RequestAction',
	ApproveAction = 'ApproveAction',
}

export const handleGreetingRequest: Middleware = (payload, respond) => {
	respond({ requestId: payload.id, data: 'hello' });
};

export type SimplePayload = RawRequest<Events, { data: string }>;

export type ApprovalPayload = RawRequest<Events, { approved: boolean }>;

export const askForApproval = (
	kernel: Kernel<Channels, Events>,
): Middleware => {
	return async (request, respond, next) => {
		const { resolve, resolveId } = kernel.createCrossResolvingRequest(
			request.id,
			10 * 1000,
		);

		chrome.windows.create({
			top: 0,
			left: 0,
			type: 'panel',
			width: 400,
			height: 500,
			url: `index.html#/${resolveId}/${request.data}`,
			focused: true,
		});

		const { approved } = await resolve<ApprovalPayload>();
		if (!approved) {
			respond({ error: 'action rejected' });
		} else {
			next?.(request);
		}
	};
};

export const handleRequestAction: Middleware = (request, respond) => {
	respond({
		data: "Action handled. You've sent: " + request.data,
	});
};

export const requestLoggingMiddleware: Middleware = (
	request,
	_respond,
	next,
) => {
	const { id, type, timeout, ...payload } = request;
	console.log(
		`[Background/ChromeKernel]: on message:
		\n\t- id: ${id} 
		\n\t- type: ${type}
		\n\t- timeout: ${timeout} ms
		\n\t- data: ${payload}`,
	);
	next?.(request);
};
