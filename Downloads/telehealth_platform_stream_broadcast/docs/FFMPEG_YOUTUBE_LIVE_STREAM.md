# YouTube Live / RTMP Stream (Browser → Node → FFmpeg)

This feature lets doctors stream their webcam directly to **YouTube Live** (or any RTMP server) from the telehealth app, without OBS.

## Flow

1. **Browser**: Doctor clicks "Start camera preview" (optional) then "Start Live Stream". The app captures webcam + mic with `getUserMedia`, encodes with **MediaRecorder** (WebM), and sends chunks over a **WebSocket** to the backend.
2. **Backend**: A WebSocket server at `/stream-ws` accepts the stream (JWT required, doctor/admin only), spawns **FFmpeg**, and pipes received WebM data into FFmpeg’s stdin.
3. **FFmpeg**: Reads WebM from stdin, re-encodes to H.264 + AAC, and:
   - Pushes to the **RTMP** URL (e.g. YouTube Live).
   - Writes a local **recording** (MP4) under `backend/recordings/`.

## Requirements

- **FFmpeg** must be installed on the server and available in `PATH` (e.g. `ffmpeg -version`).
- For **YouTube Live**: create a stream in YouTube Studio and copy the **Stream key**. Use RTMP Server URL `rtmp://a.rtmp.youtube.com/live2` and paste the key in **Stream Key**.

## Admin panel (Doctor Dashboard)

- **RTMP Server URL**: e.g. `rtmp://a.rtmp.youtube.com/live2` for YouTube.
- **Stream Key**: YouTube stream key or the key for your RTMP server.
- **Save config**: Stores in server memory (and optionally from env `RTMP_SERVER_URL`, `RTMP_STREAM_KEY`).

## API

- **GET /api/stream-config** (auth, doctor/admin): Returns current RTMP server URL and stream key.
- **POST /api/stream-config** (auth, doctor/admin): Body `{ rtmpServerUrl?, streamKey? }` to update.

## WebSocket

- **URL**: `ws://<host>/stream-ws?token=<JWT>`
- **Auth**: Query param `token` must be a valid JWT for a user with role `doctor` or `admin`.
- **Messages**:
  - Client → Server: JSON `{ type: "start", rtmpServerUrl?, streamKey? }` then binary WebM chunks.
  - Client → Server: JSON `{ type: "stop" }` to stop.
  - Server → Client: JSON `{ type: "started", recordPath }`, `{ type: "stopped", recordPath }`, or `{ type: "error", message }`.

## Recording

- Each stream is saved under `backend/recordings/` as `stream-<timestamp>.mp4`.
- Ensure the `recordings` directory exists (created automatically on first stream).

## Troubleshooting

- **"FFmpeg not found"**: Install FFmpeg and ensure it’s in the server’s `PATH`.
- **Stream not appearing on YouTube**: Check stream key and that the YouTube stream is in "Live" state; allow a few seconds for ingestion.
- **WebSocket 401**: Ensure the JWT is valid and the user has role `doctor` or `admin`.
- **Preview works but stream doesn’t**: Check browser console and backend logs; ensure no firewall blocks the WebSocket or RTMP port.
