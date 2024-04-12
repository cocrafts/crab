import { useRef, useState } from 'react';
import { ChromeChannel } from '@metacraft/crab/chrome';
import type { Response } from '@metacraft/crab/core';
import { Box, Button, Input, Text, Title } from 'components';

type KernelResponse = Response<{ data: string }>;

export const AppWithCrab = () => {
	const kernel = useRef<ChromeChannel>();
	const [connected, setConnected] = useState(false);
	const [message, setMessage] = useState('');
	const [errors, setErrors] = useState<string[]>([]);
	const [responses, setResponses] = useState<KernelResponse[]>([]);

	const handleConnect = async () => {
		if (!kernel.current) {
			kernel.current = new ChromeChannel('PopUp');
			setConnected(true);
		}
	};

	const handleChangeText = async (text: string) => {
		setMessage(text);
	};

	const sendMessage = async () => {
		if (!kernel.current) return;
		try {
			const response = await kernel.current.request<KernelResponse>({
				type: 'ping',
				data: message,
			});
			setResponses((rs) => [...rs, response]);
		} catch (error) {
			setErrors((erros) => [...erros, (error as Error).message as string]);
		}
	};

	return (
		<Box>
			{connected ? (
				<Title>Connected</Title>
			) : (
				<Button title="Connect" onClick={handleConnect} />
			)}

			<Title style={{ marginTop: 20 }}>Send a request to kernel</Title>
			<Input
				style={{ marginBottom: 10 }}
				text={message}
				onChangeText={handleChangeText}
				placeholder="Type message"
			/>

			<Button title="Send message" onClick={sendMessage} />

			<Title style={{ marginTop: 20 }}>Response</Title>
			<Box style={{ gap: 10 }}>
				{responses.map((response) => (
					<Text key={response.requestId}>{response.data}</Text>
				))}
			</Box>

			<Title style={{ marginTop: 20 }}>Error</Title>
			{errors.map((err, index) => (
				<Text key={index}>{err}</Text>
			))}
		</Box>
	);
};
