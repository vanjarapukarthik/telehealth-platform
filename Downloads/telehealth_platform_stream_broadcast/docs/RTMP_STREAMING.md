# RTMP Streaming – How It Works

## Architecture (no local FFmpeg)

This app uses **LiveKit** for WebRTC and **LiveKit Egress** for RTMP. There is no FFmpeg running on your Node server.

1. **Browser** – Doctor’s camera and microphone are published into a LiveKit room via WebRTC.
2. **LiveKit** – Encodes the room (camera + screen share + audio) and can send it to external destinations.
3. **Backend** – When you click “Start RTMP”, the Node server calls LiveKit’s Egress API with the room name and RTMP URL. LiveKit then starts a **room composite egress** and pushes the stream to that URL.

So: **browser → LiveKit (WebRTC) → LiveKit Egress → RTMP destination**. The stream is not “passed” from Node to FFmpeg; LiveKit does the encoding and push.

## Requirements

- **LiveKit Cloud** (or self‑hosted LiveKit Server) with **Egress** enabled. Egress is a paid/add‑on feature on LiveKit Cloud.
- Valid **LIVEKIT_URL**, **LIVEKIT_API_KEY**, **LIVEKIT_API_SECRET** in the backend `.env`.

## RTMP URL / stream key

- **Full URL:** `rtmp://a.rtmp.youtube.com/live2/YOUR_STREAM_KEY` (or your CDN’s RTMP URL).
- **Stream key only:** You can paste only the YouTube stream key; the backend builds the full URL as `rtmp://a.rtmp.youtube.com/live2/<key>`.

## If “Start RTMP” does nothing or fails

1. **Browser console (F12)**  
   - Look for `[RTMP] Start clicked` and `[API] POST /stream/rtmp`.  
   - If you see a 401, the request is not authenticated (log in as doctor).  
   - If you see 503, the backend could not start egress (see below).

2. **Backend logs**  
   - On start you should see: `[RTMP] EgressClient initialized successfully`.  
   - When you click Start RTMP: `[RTMP] Request received`, then either `[RTMP] Egress started successfully` or `[RTMP] Error: ...`.

3. **503 “RTMP egress not available”**  
   - EgressClient failed to load (check Node and `livekit-server-sdk` version), or  
   - Your LiveKit project does not have Egress enabled (e.g. enable it in LiveKit Cloud dashboard).

4. **500 from LiveKit**  
   - Room name must match the room the host is in.  
   - RTMP URL must be valid (e.g. correct YouTube key or full URL).  
   - Check backend console for the full error message.

## Testing without a real RTMP server

Use a test RTMP server (e.g. [rtmpsink](https://github.com/livekit/rtmpsink) or a local nginx-rtmp) and pass its ingest URL (e.g. `rtmp://localhost/live/stream`) as the RTMP URL.
