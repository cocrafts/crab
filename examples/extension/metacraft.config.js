const createEntries = (config) => {
	config.entry.background = {
		import: 'background.ts',
		filename: 'background.js',
	};

	config.entry.contentScript = {
		import: 'content/index.tsx',
		filename: 'content.js',
	};

	config.entry.injection = {
		import: 'injection.ts',
		filename: 'injection.js',
	};

	return config;
};

const swcOptions = () => {
	return {
		jsc: {
			parser: {
				syntax: 'typescript',
				tsx: true,
				dynamicImport: true,
			},
		},
	};
};

module.exports = {
	keepPreviousBuild: () => false,
	buildId: () => 'app',
	swcOptions,
	webpackMiddlewares: [createEntries],
	devMiddlewares: [],
	htmlPluginOptions: { chunks: ['app'] },
	moduleAlias: {},
};
