// Typed API client and the Storage port.
//
// The Storage port is one interface with a native (MMKV) and a web
// (IndexedDB/localStorage) implementation, so domain code never imports a
// storage library directly - which is also what makes it testable.

export {};
