import { useEffect } from 'react';
import { Button } from 'components';

export const ContentAppWithRawRuntime = () => {
	const handleSendEvent = async () => {
		const response = await chrome.runtime.sendMessage(
			'hello from content script',
		);
		console.log('[ContentScript]:', 'response from background:', response);
	};

	useEffect(() => {
		console.log(
			"[ContentScript]: It's content script from Crab",
			chrome.runtime.id,
		);
		chrome.runtime.onMessage.addListener(function (request, sender) {
			console.log(
				`[ContentScript]: on message:\n\t- requeset: ${request}\n\t- senderId: ${sender.id}`,
			);
		});
	}, []);

	return (
		<div>
			<Button title="Broadcast greeting" onClick={handleSendEvent} />
		</div>
	);
};
