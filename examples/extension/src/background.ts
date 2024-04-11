console.log("[Background]: It's background script from Crab");

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
	console.log(
		`[Background]: on message:\n\t- requeset: ${request}\n\t- senderId: ${sender.id}`,
	);

	sendResponse('hello from background');
});
