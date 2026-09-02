// Domain types and Zod schemas shared by the API and the app.
//
// One definition per contract: the API validates LLM output and requests
// against these schemas, and the client derives its TypeScript types from the
// same source, so the two cannot drift.

export * from './ai';
export * from './api';
export * from './domain';
export * from './modality';
