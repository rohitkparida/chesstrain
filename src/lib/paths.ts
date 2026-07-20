const configuredBase = import.meta.env.BASE_URL.replace(/\/$/, '');

function currentBase(): string {
	if (configuredBase && configuredBase !== '.') return configuredBase;
	return typeof window !== 'undefined' && window.location.pathname.startsWith('/chesstrain') ? '/chesstrain' : '';
}

export function appPath(path: string): string {
	const normalized = normalizeRoute(path);
	return `${currentBase()}${normalized}` || '/';
}

export function routePath(pathname: string): string {
	const base = currentBase();
	const route = base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname || '/';
	return normalizeRoute(route);
}

function normalizeRoute(path: string): string {
	let normalized = path.startsWith('/') ? path : `/${path}`;
	const base = currentBase();
	if (base && normalized.startsWith(base)) normalized = normalized.slice(base.length) || '/';
	if (/^\/login(?:\/login)+(?:\/|$)/.test(normalized)) return '/login';
	return normalized;
}
