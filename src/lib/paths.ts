const configuredBase = import.meta.env.BASE_URL.replace(/\/$/, '');
const base = configuredBase || (typeof window !== 'undefined' && window.location.pathname.startsWith('/chesstrain') ? '/chesstrain' : '');

export function appPath(path: string): string {
	const normalized = normalizeRoute(path);
	return `${base}${normalized}` || '/';
}

export function routePath(pathname: string): string {
	const route = base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname || '/';
	return normalizeRoute(route);
}

function normalizeRoute(path: string): string {
	let normalized = path.startsWith('/') ? path : `/${path}`;
	if (base && normalized.startsWith(base)) normalized = normalized.slice(base.length) || '/';
	if (/^\/login(?:\/login)+(?:\/|$)/.test(normalized)) return '/login';
	return normalized;
}
