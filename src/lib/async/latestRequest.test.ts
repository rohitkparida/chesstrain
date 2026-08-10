import { describe, expect, it } from 'vitest';
import { createLatestRequest } from './latestRequest';

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
});
