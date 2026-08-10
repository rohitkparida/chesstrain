export interface LatestRequest {
	begin(): number;
	isCurrent(requestId: number): boolean;
	cancel(): void;
}

export function createLatestRequest(): LatestRequest {
	let current = 0;
	return {
		begin() { current += 1; return current; },
		isCurrent(requestId) { return requestId === current; },
		cancel() { current += 1; }
	};
}
