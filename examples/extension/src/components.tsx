import { type FC, useState } from 'react';

type ButtonProps = {
	title: string;
	onClick: () => void;
};

export const Button: FC<ButtonProps> = ({ title, onClick }) => {
	const [hover, setHover] = useState(false);

	return (
		<button
			style={{
				paddingTop: 10,
				paddingBottom: 10,
				paddingLeft: 20,
				paddingRight: 20,
				border: 'solid',
				borderWidth: 0.5,
				borderColor: "'#dcdcdc'",
				borderRadius: 30,
				backgroundColor: hover ? '#f1f1f1' : '#ffffff',
			}}
			onClick={onClick}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			{title}
		</button>
	);
};
