export class RequestBroker<T> {
	private nextId = 0;
	private pending = new Map<string, (value: T) => void>();

	register(callback: (value: T) => void): string {
		const id = `request-${++this.nextId}`;
		this.pending.set(id, callback);
		return id;
	}

	resolve(id: string, value: T): boolean {
		const callback = this.pending.get(id);
		if (!callback) return false;
		this.pending.delete(id);
		callback(value);
		return true;
	}

	delete(id: string) {
		this.pending.delete(id);
	}
}
