import { describe, expect, it, vi } from 'vitest';
import { RequestBroker } from './requestBroker';

describe('RequestBroker', () => {
	it('routes out-of-order worker responses to the matching request', () => {
		const broker = new RequestBroker<string>();
		const first = vi.fn();
		const second = vi.fn();
		const firstId = broker.register(first);
		const secondId = broker.register(second);

		broker.resolve(secondId, 'second response');
		broker.resolve(firstId, 'first response');

		expect(first).toHaveBeenCalledWith('first response');
		expect(second).toHaveBeenCalledWith('second response');
	});

	it('ignores late responses after a timed-out request is deleted', () => {
		const broker = new RequestBroker<string>();
		const callback = vi.fn();
		const id = broker.register(callback);
		broker.delete(id);
		expect(broker.resolve(id, 'late')).toBe(false);
		expect(callback).not.toHaveBeenCalled();
	});
});
