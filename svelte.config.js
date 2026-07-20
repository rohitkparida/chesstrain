import adapter from '@sveltejs/adapter-static';

const dev = process.env.NODE_ENV !== 'production';
const repositoryBase = process.env.GITHUB_ACTIONS === 'true' ? '/chesstrain' : '';

export default {
	kit: {
		adapter: adapter({ fallback: '200.html' }),
		paths: { base: dev ? '' : repositoryBase }
	},
	compilerOptions: { runes: true }
};
