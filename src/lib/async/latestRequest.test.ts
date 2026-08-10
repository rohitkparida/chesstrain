import { describe, expect, it } from 'vitest';
import { createLatestRequest, resolveLatest } from './latestRequest';

describe('latest request guard', () => {
	it('accepts only the newest request', () => {
		const requests = createLatestRequest();
		const first = requests.begin();
		const second = requests.begin();
		expect(requests.isCurrent(first)).toBe(false);
		expect(requests.isCurrent(second)).toBe(true);
	});

	it('invalidates the current request on cancel', () => {
		const requests = createLatestRequest();
		const requestId = requests.begin();
		requests.cancel();
		expect(requests.isCurrent(requestId)).toBe(false);
	});

	it('drops stale results and normalizes failures', async () => {
		const requests = createLatestRequest();
		const first = requests.begin();
		const second = requests.begin();
		expect(await resolveLatest(requests, first, Promise.resolve('stale'))).toBeNull();
		expect(await resolveLatest(requests, second, Promise.resolve('current'))).toBe('current');
		expect(await resolveLatest(requests, second, Promise.reject(new Error('engine failed')))).toBeNull();
	});
});
