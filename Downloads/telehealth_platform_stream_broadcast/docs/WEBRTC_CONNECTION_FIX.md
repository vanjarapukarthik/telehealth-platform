# WebRTC / LiveKit Connection Fix

## Errors you were seeing

- **"Initial connection failed with ConnectionError: could not establish pc connection"**  
  The WebRTC peer connection (PC) never completed — e.g. WebSocket to LiveKit works but ICE/DTLS fails.

- **"could not createOffer with closed peer connection"**  
  Code tried to create an offer (or publish) on a peer connection that was already closed, often because the connection failed or was torn down.

## Why the peer connection can close

1. **Publishing before the room is fully connected**  
   If you call `publishTrack()` before the room is in `Connected` state, the peer connection may not be ready and can close or fail.

2. **Wrong or unreachable LiveKit URL**  
   If `LIVEKIT_URL` is wrong, or the server is behind a firewall/VPN, the browser cannot complete the WebRTC handshake.

3. **Token/URL mismatch**  
   The token must be issued for the same LiveKit server as the URL the client uses. If the frontend uses a different URL than the backend’s `LIVEKIT_URL`, connection can fail.

4. **Network / ICE**  
   Firewalls, strict NAT, or missing TURN can prevent the peer connection from being established even when the WebSocket connects.

## Step-by-step fix applied

### 1. Wait for `RoomEvent.Connected` before publishing

We only create and publish camera/mic **after** the room is connected:

- After `room.connect()`, we wait for `RoomEvent.Connected` (or check `room.state === ConnectionState.Connected`).
- Only then we call `createLocalVideoTrack()`, `createLocalAudioTrack()`, and `publishTrack()`.

This avoids using a peer connection that isn’t ready yet, which was leading to “closed peer connection” when creating an offer.

### 2. Room and connect options

- **Room options**: `adaptiveStream: true`, `dynacast: true`, `disconnectOnPageLeave: false`.
- **Connect options**: `peerConnectionTimeout: 20_000`, `websocketTimeout: 10_000`, `maxRetries: 3` so the client has time to establish the PC and can retry.

### 3. Connection state handling

- We listen for `RoomEvent.ConnectionStateChanged` and `RoomEvent.Disconnected` to log and show status (e.g. “Reconnecting…”, “Disconnected”).
- If the room disconnects before we finish the “wait for Connected” step, we reject and don’t try to publish.

### 4. getUserMedia (camera) options

- We call `createLocalVideoTrack({ resolution: { width: 1280, height: 720 }, facingMode: "user" })` so the camera stream is requested with explicit constraints and works consistently across devices.

### 5. Backend LiveKit URL

- The token endpoint normalizes `LIVEKIT_URL` so the frontend always gets a valid `wss://` (or `ws://`) URL. This keeps token and URL in sync and avoids connection failures due to wrong URL format.

## What to check if it still fails

1. **Backend `.env`**  
   Set `LIVEKIT_URL` to your LiveKit server (e.g. `wss://your-project.livekit.cloud`). It must be reachable from the browser.

2. **Browser console**  
   You should see `[LiveKit] Connecting to wss://...` and then `[LiveKit] Connection state: connected`. If you see `disconnected` or `reconnecting` right away, the issue is network or LiveKit URL/token.

3. **HTTPS / localhost**  
   Use the app over HTTPS or `localhost` so getUserMedia and WebRTC are allowed.

4. **Camera permission**  
   If the connection succeeds but video doesn’t show, check that the browser has camera (and mic) permission for the site.

## Summary

- **Cause**: Publishing (and thus createOffer) was happening before the LiveKit room was fully connected, so the peer connection was not ready or had already closed.
- **Fix**: Wait for `RoomEvent.Connected` (or `ConnectionState.Connected`) before creating local tracks and calling `publishTrack()`, and add timeouts, retries, and URL normalization so the connection and camera stream are stable.
