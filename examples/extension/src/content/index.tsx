import { createRoot } from 'react-dom/client';

import { ContentAppWithRawRuntime } from './Raw';

const ContentApp = () => {
	return (
		<div
			style={{
				width: 400,
				height: 400,
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
			}}
		>
			<h3 style={{ margin: 0 }}>Crab - content script</h3>
			<h4>Content App with raw chrome runtime</h4>
			<ContentAppWithRawRuntime />
		</div>
	);
};

const container = document.createElement('div');
container.id = 'crab-content-container';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<ContentApp />);
