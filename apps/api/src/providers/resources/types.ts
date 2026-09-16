import type { ResourceCandidate } from '@reps/core';

export interface ResourceQuery {
  text: string;
  language: string;
  maxResults?: number;
  /** Defaults to video. The composite provider routes on this. */
  format?: 'video' | 'article';
}

/** Where real resources come from. Models emit queries; this resolves them. */
export interface ResourceProvider {
  readonly name: string;
  search(query: ResourceQuery): Promise<ResourceCandidate[]>;
}
