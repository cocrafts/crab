/**
 * This module create kernel-channels communication for chrome extension
 * refs: https://developer.chrome.com/docs/extensions/develop/concepts/messaging
 *
 * We have two type of messaging, one-time requests and long-lived connections
 *
 * With one-time requests:
 * - extensionPage need to know which tab to send the request.
 * - use `chrome.runtime.onMessage.addListener` to listen requests, and respond by `sendResponse` in the callback
 * - if having multiple listeners able to respond, the first one calls `sendResponse` will respond the request
 *
 * With long-lived connections:
 * - contentScript passes messages to extensionPage by `chrome.runtime.connect`
 * - extensionPage passes messages to contentScript by `chrome.tabs.connect`
 * - when connection established, each side will have a `runtime.Port` object to send messages
 * - to handle incoming connection for both sides, use `runtime.onConnect.addListener`
 * - the most important part of long-lived connection is `Port` which represents a connection
 *
 * It also possible for defining cross-extension and external webpages communication
 *
 * The term `extensionPage` stands for a page in chrome extension, including popup and background.
 * But for long-running handler, kernel might only used in the background
 */

export * from './channel';
export * from './kernel';
