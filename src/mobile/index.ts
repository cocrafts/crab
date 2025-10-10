/**
 * Mobile (React Native) messaging implementation.
 *
 * Uses in-memory message bus since mobile apps run in a single JavaScript context.
 * No IPC needed - messages are delivered via event emitters with Promise.resolve
 * to simulate async behavior.
 *
 * API is identical to Chrome/Web implementations for consistency.
 */

export * from './channel';
export * from './kernel';