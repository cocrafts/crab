export const deepFreeze = (hm: unknown) => {
	if (!hm || typeof hm !== 'object') return;

	Object.keys(hm).forEach((key) => {
		deepFreeze(hm[key as never]);
	});

	return Object.freeze(hm);
};

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type RequireKeys<T, K extends keyof T> = Required<Pick<T, K>> &
	Omit<T, K>;
