import { useEffect } from 'react';

export const AppWithRawRuntime = () => {
	const broadcastGreetingToTopFrameExtension = async () => {
		const response = await chrome.runtime.sendMessage('hello from popup');
		console.log('[Popup]:', 'response from background:', response);
	};

	const broadcastGreetingToTabs = async () => {
		const tabs = await chrome.tabs.query({});
		tabs.forEach((tab) => {
			if (!tab.id) return;
			chrome.tabs.sendMessage(tab.id, 'hello from popup to content script');
		});
	};

	useEffect(() => {
		console.log("[Popup]: It's popup script from Crab");
		chrome.runtime.onMessage.addListener(function (request, sender) {
			console.log(
				`[Popup]: on message:\n\t- requeset: ${request}\n\t- senderId: ${sender.id}`,
			);
		});
	}, []);

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
			}}
		>
			<button onClick={broadcastGreetingToTopFrameExtension}>
				Broadcast greeting to Top Frame
			</button>
			<button onClick={broadcastGreetingToTabs}>
				Broadcast greeting to Content Script
			</button>
		</div>
	);
};
