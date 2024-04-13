import { ChromeKernel } from '@metacraft/crab/chrome';
import {
	askForApproval,
	Channels,
	Events,
	handleGreetingRequest,
	handleRequestAction,
	requestLoggingMiddleware,
} from 'messaging';

console.log("[Background]: It's background script from Crab");

/**
 * For one-time requests
 * */
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log(
		`[Background]: on message:\n\t- requeset: ${request}\n\t- senderId: ${sender.id}`,
	);

	sendResponse('hello from background');
});

/**
 * With Crab
 */

const kernel = new ChromeKernel<Channels, Events>();

kernel
	.use(requestLoggingMiddleware)
	.channel(Channels.Popup)
	.handle(Events.Greeting)
	.use(handleGreetingRequest)
	.handle(Events.ApproveAction)
	.use(kernel.handleCrossResolvingMiddleware)

	.channel(Channels.ContentScript)
	.handle(Events.Greeting)
	.use(handleGreetingRequest)
	.handle(Events.RequestAction)
	.use(askForApproval(kernel))
	.use(handleRequestAction)
	.run();
