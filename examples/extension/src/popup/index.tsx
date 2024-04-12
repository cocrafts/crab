import { createRoot } from 'react-dom/client';

import { AppWithCrab } from './Crab';
import { AppWithRawRuntime } from './Raw';

const App = () => {
	return (
		<div
			style={{
				padding: 10,
				paddingLeft: 20,
				paddingRight: 20,
			}}
		>
			<h3 style={{ margin: 0 }}>Crab App</h3>
			<h4 style={{ margin: 0 }}>App with raw chrome runtime</h4>
			<AppWithRawRuntime />

			<h4 style={{ margin: 0, marginTop: 10 }}>App with Crab messaging</h4>
			<AppWithCrab />
		</div>
	);
};

document.body.style.width = '500px';
document.body.style.height = '600px';
document.body.style.margin = '0px';
const container = document.getElementById('root');
if (container) {
	const root = createRoot(container);
	root.render(<App />);
}
