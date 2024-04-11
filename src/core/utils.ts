export const deepFreeze = (obj: object) => {
	Object.keys(obj).forEach((key) => {
		if (typeof obj[key as never] === 'object') {
			deepFreeze(obj[key as never]);
		}
	});

	return Object.freeze(obj);
};
