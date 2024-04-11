import { createRoot } from 'react-dom/client';

const ContentApp = () => {
	return (
		<div>
			<h1>Content script</h1>
		</div>
	);
};

const container = document.createElement('div');
container.id = 'crab-content-container';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<ContentApp />);
