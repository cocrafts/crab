/**
 * This module create kernel-channels communication for web runtime
 *
 * On web, all communication is done via `window.postMessage`, and `window.addEventListener`.
 * It's totally async, so we add `from` and `to` fields in the request payload
 * for filtering request/response
 */

export * from './channel';
export * from './kernel';
