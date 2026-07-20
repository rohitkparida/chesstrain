const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function appPath(path: string): string {
	const normalized = path.startsWith('/') ? path : `/${path}`;
	return `${base}${normalized}` || '/';
}

export function routePath(pathname: string): string {
	return base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname || '/';
}
