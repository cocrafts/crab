import { useEffect, useRef, useState } from 'react';
import { ChromeChannel } from '@metacraft/crab/chrome';
import { Box, Button, Text, Title } from 'components';
import { Channels, Events } from 'messaging';

export const Approval = () => {
	const { hash } = new URL(window.location.href);
	const channel = useRef<ChromeChannel>();
	const [errors, setErrors] = useState<string[]>([]);
	const [ok, setOk] = useState(false);

	useEffect(() => {
		channel.current = new ChromeChannel(Channels.Popup);
	}, []);

	const handleApproval = async (approved: boolean) => {
		if (!channel.current) return;
		try {
			const [, resolveId] = hash.replace('#', '').split('/');
			await channel.current.request({
				type: Events.ApproveAction,
				approved,
				resolveId,
			});
			setOk(true);
		} catch (error) {
			setErrors((erros) => [...erros, (error as Error).message as string]);
		}
	};

	return (
		<Box>
			<Title>Approval</Title>
			<Text>Action: {hash}</Text>
			<Button title="Approve" onClick={() => handleApproval(true)} />
			<Button title="Reject" onClick={() => handleApproval(false)} />
			{ok && <Text>Approved</Text>}

			{errors.map((err, index) => (
				<Text key={index}>{err}</Text>
			))}
		</Box>
	);
};
