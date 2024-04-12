import type { CSSProperties, ReactNode } from 'react';
import { type FC, useState } from 'react';

type ButtonProps = {
	title: string;
	style?: CSSProperties;
	onClick: () => void;
};

export const Button: FC<ButtonProps> = ({ title, style, onClick }) => {
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
				...style,
			}}
			onClick={onClick}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			{title}
		</button>
	);
};

type TextProps = {
	children: string;
	style?: CSSProperties;
};

export const Text: FC<TextProps> = ({ children, style }) => (
	<p
		style={{
			fontSize: 14,
			margin: 0,
			padding: 0,
			...style,
		}}
	>
		{children}
	</p>
);

export const Title: FC<TextProps> = ({ children, style }) => (
	<p
		style={{
			fontSize: 14,
			fontWeight: 600,
			margin: 0,
			padding: 0,
			...style,
		}}
	>
		{children}
	</p>
);

type InputProps = {
	style?: CSSProperties;
	text?: string;
	placeholder?: string;
	onChangeText?: (text: string) => void;
};

export const Input: FC<InputProps> = ({
	text,
	placeholder,
	onChangeText,
	style,
}) => (
	<input
		value={text}
		onChange={(e) => onChangeText?.(e.target.value)}
		placeholder={placeholder}
		style={{
			padding: 10,
			borderRadius: 10,
			fontSize: 14,
			fontWeight: 600,
			...style,
		}}
	/>
);

type BoxProps = {
	style?: CSSProperties;
	children?: ReactNode;
};

export const Box: FC<BoxProps> = ({ style, children }) => (
	<div
		style={{
			display: 'flex',
			flexDirection: 'column',
			...style,
		}}
	>
		{children}
	</div>
);
