import { createRoot } from 'react-dom/client';
import { Box, Title } from 'components';

import { ContentAppWithCrab } from './Crab';
import { ContentAppWithRawRuntime } from './Raw';

const ContentApp = () => {
	return (
		<Box
			style={{
				width: 400,
				minHeight: 400,
				maxHeight: 800,
				position: 'fixed',
				bottom: 0,
				right: 0,
				border: 'solid',
				borderWidth: 0.5,
				borderRadius: 20,
				borderColor: '#ccc',
				padding: 10,
				paddingLeft: 20,
				paddingRight: 20,
				overflow: 'scroll',
			}}
		>
			<Title style={{ fontSize: 18 }}>Crab - content script</Title>
			<Title style={{ marginBottom: 10 }}>
				Content App with raw chrome runtime
			</Title>
			<ContentAppWithRawRuntime />

			<Title style={{ marginBottom: 10, marginTop: 20 }}>
				Content App with Crab
			</Title>
			<ContentAppWithCrab />
		</Box>
	);
};

const container = document.createElement('div');
container.id = 'crab-content-container';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<ContentApp />);
