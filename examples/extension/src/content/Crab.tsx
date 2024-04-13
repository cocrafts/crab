import { useRef, useState } from 'react';
import { ChromeChannel } from '@metacraft/crab/chrome';
import type { RawRequest, Response } from '@metacraft/crab/core';
import { Box, Button, Input, Text, Title } from 'components';
import type { SimplePayload } from 'messaging';
import { Channels, Events } from 'messaging';

type KernelResponse = Response<{ data: string }>;

export const ContentAppWithCrab = () => {
	const channel = useRef<ChromeChannel>();
	const [connected, setConnected] = useState(false);
	const [action, setAction] = useState('');
	const [errors, setErrors] = useState<string[]>([]);
	const [responses, setResponses] = useState<KernelResponse[]>([]);

	const handleConnect = async () => {
		if (!channel.current) {
			channel.current = new ChromeChannel(Channels.ContentScript);
			setConnected(true);
		}
	};

	const handleChangeText = async (text: string) => {
		setAction(text);
	};

	const sendGreeting = async () => {
		if (!channel.current) return;
		try {
			const payload: RawRequest = {
				type: Events.Greeting,
			};
			const response = await channel.current.request<KernelResponse>(payload);
			setResponses((rs) => [...rs, response]);
		} catch (error) {
			setErrors((erros) => [...erros, (error as Error).message as string]);
		}
	};

	const sendRequestAction = async () => {
		if (!channel.current) return;
		try {
			const payload: SimplePayload = {
				type: Events.RequestAction,
				data: action,
			};
			const response = await channel.current.request<KernelResponse>(
				payload,
				10 * 1000,
			);
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

			<Button
				style={{ marginTop: 20 }}
				title="Send greeting"
				onClick={sendGreeting}
			/>

			<Title style={{ marginTop: 20 }}>
				Send a request action and wait for approval from app
			</Title>
			<Input
				style={{ marginBottom: 10 }}
				text={action}
				onChangeText={handleChangeText}
				placeholder="Type action to request"
			/>

			<Button title="Send request" onClick={sendRequestAction} />

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
