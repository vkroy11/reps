import type { ResourceCandidate } from '@reps/core';

export interface ResourceQuery {
  text: string;
  language: string;
  maxResults?: number;
}

/** Where real resources come from. Models emit queries; this resolves them. */
export interface ResourceProvider {
  readonly name: string;
  search(query: ResourceQuery): Promise<ResourceCandidate[]>;
}
