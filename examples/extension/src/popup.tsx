import { createRoot } from 'react-dom/client';

const App = () => {
	return (
		<div style={{ flex: 1 }}>
			<h1>Crab App</h1>
		</div>
	);
};

document.body.style.width = '600px';
document.body.style.height = '400px';
const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}
