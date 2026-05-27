import { getStreamConfig, setStreamConfig } from "../services/streamConfig.js";

export function getConfig(req, res) {
  try {
    const config = getStreamConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to get config" });
  }
}

export function updateConfig(req, res) {
  try {
    const { rtmpServerUrl, streamKey } = req.body ?? {};
    const config = setStreamConfig({
      rtmpServerUrl: rtmpServerUrl ?? getStreamConfig().rtmpServerUrl,
      streamKey: streamKey ?? getStreamConfig().streamKey,
    });
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to update config" });
  }
}
