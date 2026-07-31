export interface PuzzleShardManifest {
	version: number;
	shards: readonly PuzzleShardDescriptor[];
}

export interface PuzzleShardDescriptor {
	id: string;
	url: string;
	minRating: number;
	maxRating: number;
	tags: readonly string[];
	count: number;
}

export interface SharedPuzzleRepository {
	getManifest(signal?: AbortSignal): Promise<PuzzleShardManifest>;
	getShard(id: string, signal?: AbortSignal): Promise<unknown>;
}
