export interface LatestRequest {
	begin(): number;
	isCurrent(requestId: number): boolean;
	cancel(): void;
}

/** Resolve an async task only while its request is still current.
 * Rejected engine tasks are treated as unavailable results so callers can
 * finish their normal UI transition without leaking unhandled rejections.
 */
export async function resolveLatest<T>(
  request: LatestRequest,
  requestId: number,
  task: Promise<T>
): Promise<T | null> {
  try {
    const value = await task;
    return request.isCurrent(requestId) ? value : null;
  } catch {
    return null;
  }
}

export function createLatestRequest(): LatestRequest {
	let current = 0;
	return {
		begin() { current += 1; return current; },
		isCurrent(requestId) { return requestId === current; },
		cancel() { current += 1; }
	};
}
