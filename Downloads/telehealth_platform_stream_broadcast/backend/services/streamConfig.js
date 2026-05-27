/**
 * In-memory stream config (RTMP URL, stream key).
 * Defaults from env; can be updated via admin API.
 */
const DEFAULT_RTMP_SERVER =
  process.env.RTMP_SERVER_URL || "rtmp://a.rtmp.youtube.com/live2";
const DEFAULT_STREAM_KEY = process.env.RTMP_STREAM_KEY || "";

let rtmpServerUrl = DEFAULT_RTMP_SERVER;
let streamKey = DEFAULT_STREAM_KEY;

export function getStreamConfig() {
  return {
    rtmpServerUrl: rtmpServerUrl || DEFAULT_RTMP_SERVER,
    streamKey: streamKey || DEFAULT_STREAM_KEY,
  };
}

export function setStreamConfig({ rtmpServerUrl: url, streamKey: key } = {}) {
  if (url !== undefined) rtmpServerUrl = String(url).trim() || DEFAULT_RTMP_SERVER;
  if (key !== undefined) streamKey = String(key).trim() || DEFAULT_STREAM_KEY;
  return getStreamConfig();
}

/** Build full RTMP URL from server + key, or return streamKey-only for YouTube. */
export function getFullRtmpUrl() {
  const server = rtmpServerUrl || DEFAULT_RTMP_SERVER;
  const key = streamKey || DEFAULT_STREAM_KEY;
  if (!key) return null;
  if (/^rtmps?:\/\//i.test(key)) return key;
  const base = server.replace(/\/+$/, "");
  return `${base}/${key}`;
}
