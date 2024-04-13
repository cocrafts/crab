export const deepFreeze = (obj: object) => {
	Object.keys(obj).forEach((key) => {
		if (typeof obj[key as never] === 'object') {
			deepFreeze(obj[key as never]);
		}
	});

	return Object.freeze(obj);
};

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type RequireKeys<T, K extends keyof T> = Required<Pick<T, K>> &
	Omit<T, K>;
