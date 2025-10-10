# Crab - Universal Messaging Library

**Purpose**: Unified async messaging abstraction across Extension, Web, and Mobile platforms.

**Current Status**: Production-ready core, planned enhancements for Chrome Extension use cases.

---

## Architecture Overview

### Core Concepts

**Channel**: Named bidirectional communication endpoint (e.g., 'Popup', 'ContentScript')
- Messages routed via `from`/`to` fields
- Platform-agnostic abstraction
- Request/response matching via requestId

**Kernel**: Message router with middleware pipeline
- Maps (channelId, eventType) → middleware handlers
- Supports cross-resolving for multi-hop async flows
- Auto-timeout management with cleanup

**AsyncChannel**: Base class for platform implementations
- Request pooling with timeout tracking
- Promise-based API wrapper
- Handles incoming response matching

---

## Platform Implementations

### Chrome Extension (`src/chrome/`)

**Transport**: `chrome.runtime.connect()` (Port-based)

**Features**:
- ✅ Bidirectional communication
- ✅ Auto-reconnect on disconnect
- ✅ BFCache support (pageshow event)
- ✅ Named ports for channel identification

**Current Implementation**:
```typescript
// Channel (Content Script side)
const channel = new ChromeChannel('ContentScript');
await channel.request({ type: 'SignTx', tx });

// Kernel (Background side)
const kernel = new ChromeKernel();
kernel
  .channel('ContentScript')
  .handle('SignTx')
  .use(signTxHandler)
  .run();
```

---

### Web Browser (`src/web/`)

**Transport**: `window.postMessage()`

**Features**:
- ✅ Iframe/window communication
- ✅ Channel routing via `from`/`to` fields
- ✅ Same API as Chrome implementation

---

### Mobile (`src/mobile/`)

**Transport**: In-memory message bus (Promise-based)

**Features**:
- ✅ Pure Promise.resolve() for async simulation
- ✅ No IPC needed (single JS context)
- ✅ Same API as Chrome/Web implementations
- ✅ Event-based routing via global MessageBus

**Current Implementation**:
```typescript
// Component A (UI)
const channel = new MobileChannel('WalletService');
const result = await channel.request({ type: 'GetBalance' });

// Component B (Service)
const kernel = new MobileKernel();
kernel
  .channel('WalletService')
  .handle('GetBalance')
  .use(async (request, respond) => {
    const balance = await getBalance();
    respond({ balance });
  })
  .run();
```

**Why Pure Promises?**
- React Native apps run in single JavaScript context
- No need for complex IPC mechanisms
- `setImmediate()` / `setTimeout(0)` simulates async messaging
- Maintains API consistency across platforms

---

## Planned Enhancements

### 1. AbortSignal Support

**Priority**: High
**Use Case**: Cancel pending requests when user navigates away or closes popup

**Implementation**:
```typescript
export class AsyncChannel {
  async request<T>(
    request: RawRequest,
    timeout: number = 1000,
    signal?: AbortSignal
  ): Promise<T> {
    const requestId = request.id || crypto.randomUUID();

    return new Promise((resolve, reject) => {
      // Handle abort
      signal?.addEventListener('abort', () => {
        delete this.requestPool[requestId];
        reject(new DOMException('Request cancelled', 'AbortError'));
      });

      this.requestPool[requestId] = {
        requestId,
        resolve,
        reject,
        timeout,
        sentAt: new Date(),
        payload: request,
      };

      this.push(request);
    });
  }
}
```

**Usage**:
```typescript
const controller = new AbortController();

// Start request
const promise = channel.request(
  { type: 'SignTransaction', tx },
  5000,
  controller.signal
);

// Cancel if needed
controller.abort(); // Rejects promise with AbortError
```

**Benefits**:
- Clean cancellation without memory leaks
- Standard Web API (AbortSignal)
- Works with Promise.race() for multiple operations

---

### 2. Port State Management

**Priority**: High
**Use Case**: Check if background service worker is available before sending

**Implementation**:
```typescript
export class ChromeChannel extends AsyncChannel {
  private _isConnected = false;
  private disconnectCallbacks: Array<() => void> = [];

  private connect(
    channelId: string,
    autoReconnect?: boolean
  ): chrome.runtime.Port {
    const connection = chrome.runtime.connect({ name: channelId });
    this._isConnected = true;

    connection.onMessage.addListener((message) => {
      this.handleIncoming(message);
    });

    connection.onDisconnect.addListener(() => {
      this._isConnected = false;

      // Notify listeners
      this.disconnectCallbacks.forEach(cb => {
        try {
          cb();
        } catch (error) {
          console.error('[ChromeChannel] Disconnect callback error:', error);
        }
      });

      if (autoReconnect) {
        console.warn('Port disconnected, attempting to reconnect...');
        this.connection = this.connect(channelId, autoReconnect);
      }
    });

    return connection;
  }

  /**
   * Check if port is currently connected
   */
  isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Register callback for disconnect events
   */
  onDisconnect(callback: () => void): void {
    this.disconnectCallbacks.push(callback);
  }

  /**
   * Remove disconnect callback
   */
  offDisconnect(callback: () => void): void {
    this.disconnectCallbacks = this.disconnectCallbacks.filter(
      cb => cb !== callback
    );
  }

  /**
   * Wait until connected (useful after disconnect)
   */
  async waitForConnection(timeout: number = 5000): Promise<void> {
    if (this._isConnected) return;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, timeout);

      const checkConnection = () => {
        if (this._isConnected) {
          clearTimeout(timer);
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }
}
```

**Usage**:
```typescript
const channel = new ChromeChannel('ContentScript', { autoReconnect: true });

// Check before sending
if (channel.isConnected()) {
  await channel.request({ type: 'GetBalance' });
}

// Listen for disconnects
channel.onDisconnect(() => {
  console.log('Background disconnected, retrying...');
});

// Wait for reconnection
try {
  await channel.waitForConnection(5000);
  console.log('Reconnected successfully');
} catch (error) {
  console.error('Failed to reconnect:', error);
}
```

**Benefits**:
- Avoid sending requests to disconnected background
- Handle service worker lifecycle gracefully
- Better UX with connection status feedback

---

## Implementation Notes

### Request/Response Flow

```
1. Content Script creates channel
   └─> new ChromeChannel('ContentScript')

2. Send request
   └─> channel.request({ type: 'SignTx', tx })
       ├─> Generate requestId
       ├─> Add to requestPool
       ├─> port.postMessage({ id, type, from: 'ContentScript', tx })
       └─> Return Promise

3. Background receives message
   └─> chrome.runtime.onConnect listener
       ├─> Extract channelId from port.name
       ├─> kernel.execute(channelId, request, respond)
       └─> Run middleware pipeline

4. Middleware processes
   └─> middleware(request, respond, next)
       ├─> Async operations (DB, API calls, etc.)
       └─> respond({ result })

5. Background sends response
   └─> port.postMessage({ requestId, result })

6. Content Script receives response
   └─> port.onMessage listener
       ├─> Match requestId in requestPool
       ├─> Resolve promise
       └─> Remove from requestPool
```

---

## Security Considerations

**Current Status**: Transport-level security only (Chrome's isolation)

**Out of Scope** (handled at application layer):
- Message validation (schema validation)
- Source authentication (sender verification)
- Origin allowlisting (content script origins)
- Permission management (per-origin access control)
- Rate limiting (DoS prevention)

**Recommendation**: Implement validation in application-specific middleware:

```typescript
// In Arcane wallet
kernel
  .use(validateSchemaMiddleware)  // Valibot validation
  .use(validateOriginMiddleware)  // Check sender.tab.url
  .channel('ContentScript')
  .handle('SignTransaction')
  .use(signTransactionHandler);
```

---

## Performance Characteristics

### Message Overhead
- **Port setup**: ~2-5ms (one-time per channel)
- **Message latency**: ~3-10ms (content ↔ background)
- **Timeout cleanup**: 1000ms interval (configurable)

### Memory Usage
- **Request pool**: ~100 bytes per pending request
- **Middleware chains**: Negligible (functions)
- **Port connections**: ~1KB per channel

### Service Worker Lifetime (Chrome 114+)
- **Idle timeout**: 30 seconds after last message
- **Port keeps SW alive**: Only during active message flow
- **No resource concerns**: SW terminates normally when idle

---

## Testing Strategy

### Unit Tests
- Request/response matching
- Timeout cleanup
- Middleware pipeline execution
- Error handling

### Integration Tests
- Chrome extension environment
- Port connection/disconnection
- Cross-resolving flows
- BFCache restoration

### Manual Testing
- Service worker lifecycle (wake/sleep)
- Network instability (disconnect/reconnect)
- Multiple tabs (broadcast scenarios)
- Extension reload (graceful degradation)

---

## Migration Guide

### From Direct Chrome APIs

**Before**:
```typescript
// Content script
chrome.runtime.sendMessage({ type: 'GetBalance' }, (response) => {
  console.log(response.balance);
});

// Background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GetBalance') {
    getBalance().then(balance => sendResponse({ balance }));
    return true;
  }
});
```

**After**:
```typescript
// Content script
const channel = new ChromeChannel('ContentScript');
const response = await channel.request({ type: 'GetBalance' });
console.log(response.balance);

// Background
const kernel = new ChromeKernel();
kernel
  .channel('ContentScript')
  .handle('GetBalance')
  .use(async (request, respond) => {
    const balance = await getBalance();
    respond({ balance });
  })
  .run();
```

**Benefits**:
- Promise-based (no callback hell)
- Automatic timeout management
- Type-safe with TypeScript
- Middleware composition
- Cross-platform compatibility

---

## API Reference

### ChromeChannel

```typescript
class ChromeChannel extends AsyncChannel {
  constructor(
    channelId: string,
    configs?: {
      autoReconnect?: boolean;
    }
  );

  // Inherited from AsyncChannel
  request<T>(
    payload: RawRequest,
    timeout?: number,
    signal?: AbortSignal // PLANNED
  ): Promise<T>;

  // PLANNED: Port state management
  isConnected(): boolean;
  onDisconnect(callback: () => void): void;
  offDisconnect(callback: () => void): void;
  waitForConnection(timeout?: number): Promise<void>;
}
```

### ChromeKernel

```typescript
class ChromeKernel<
  ChannelId extends string = string,
  EventType extends string | number = string
> extends Kernel<ChannelId, EventType> {
  // Setup channels and handlers
  channel(channelId: ChannelId): this;
  handle(eventType: EventType): this;
  use(middleware: Middleware<EventType>): this;
  unwrap(): this;

  // Start listening
  run(cleanInterval?: number): void;

  // Cross-resolving support
  createCrossResolvingRequest(
    requestId: string,
    timeout?: number
  ): {
    resolveId: string;
    resolve: <T>() => Promise<T>;
  };

  handleCrossResolvingMiddleware: Middleware;
}
```

### Middleware

```typescript
type Middleware<EventType = any> = (
  request: Request<EventType>,
  respond: (response: RawResponse) => void,
  next?: (request: Request<EventType>) => void
) => Promise<void> | void;
```

---

## Examples

### Basic Request/Response

```typescript
// Content Script
const channel = new ChromeChannel('ContentScript');
const { balance } = await channel.request({ type: 'GetBalance' });

// Background
kernel
  .channel('ContentScript')
  .handle('GetBalance')
  .use(async (request, respond) => {
    const balance = await getWalletBalance();
    respond({ balance });
  });
```

### Multi-hop Approval Flow (Cross-Resolving)

```typescript
// Content Script → Background → Popup → Background → Content Script

// Background
kernel
  .channel('ContentScript')
  .handle('SignTransaction')
  .use(async (request, respond, next) => {
    // Create cross-resolving context
    const { resolveId, resolve } = kernel.createCrossResolvingRequest(
      request.id,
      30000
    );

    // Open popup with resolveId
    chrome.windows.create({
      url: `popup.html#/approve/${resolveId}`,
      type: 'popup',
      width: 400,
      height: 600,
    });

    // Wait for user approval
    const { approved } = await resolve<{ approved: boolean }>();

    if (!approved) {
      respond({ error: 'User rejected transaction' });
    } else {
      next?.(request); // Continue to signing
    }
  })
  .use(async (request, respond) => {
    const signature = await signTransaction(request.tx);
    respond({ signature });
  });

// Popup
kernel
  .channel('Popup')
  .handle('ApproveTransaction')
  .use(kernel.handleCrossResolvingMiddleware); // Auto-resolves

// Popup UI
const popupChannel = new ChromeChannel('Popup');
await popupChannel.request({
  type: 'ApproveTransaction',
  resolveId, // From URL
  approved: true,
});
```

### Error Handling

```typescript
try {
  const result = await channel.request({ type: 'SignTx', tx }, 5000);
} catch (error) {
  if (error.message === 'Request timeout') {
    console.error('Background not responding');
  } else if (error.message.includes('rejected')) {
    console.error('User rejected');
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## Future Considerations

### Not Planned (Out of Scope)
- ❌ Request queue/priority - Overkill for wallet operations
- ❌ Progress/streaming - Not needed for current use cases
- ❌ Telemetry/metrics - Handle at application layer
- ❌ Middleware context passing - Use request.context instead

### Maybe Later
- ⚠️ Broadcasting API - Notify all tabs of state changes (easy to add if needed)
- ⚠️ Retry logic - Exponential backoff for unstable connections (can add as middleware)

---

## Troubleshooting

### "Port disconnected" errors
- Check if service worker is still alive
- Enable `autoReconnect: true` in channel config
- Add disconnect listener for graceful handling

### "Request timeout" errors
- Increase timeout value (default: 1000ms)
- Check if background script is running
- Verify middleware calls `respond()` or `next()`

### Messages not received
- Verify channel IDs match between sender/receiver
- Check if kernel is running (`kernel.run()`)
- Ensure middleware calls `respond()` eventually

---

## Contributing

When adding new features:

1. **Keep platform-agnostic** - New features should work on Chrome/Web/Mobile
2. **Update all implementations** - Chrome, Web, Mobile (if applicable)
3. **Add tests** - Unit + integration tests
4. **Update CLAUDE.md** - Document new APIs and examples
5. **Maintain backward compatibility** - Don't break existing code

---

## License

MIT

---

**Last Updated**: 2025-10-09
**Version**: 0.0.1 (pre-release)
**Maintainer**: Arcane Wallet Team
