import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Helper for validation
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Master playlist
app.get("/generate-master-hls", (req, res) => {
  const { video_url, audio_url } = req.query;

  if (!isValidUrl(video_url) || !isValidUrl(audio_url)) {
    return res
      .status(400)
      .send("video_url and audio_url must be valid http/https URLs");
  }

  const master = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,CODECS="avc1.640029,mp4a.40.2"
${req.protocol}://${req.get("host")}/video.m3u8?video_url=${encodeURIComponent(
    video_url
  )}
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Indonesian",LANGUAGE="id",AUTOSELECT=YES,DEFAULT=YES,URI="${req.protocol}://${req.get(
    "host"
  )}/audio.m3u8?audio_url=${encodeURIComponent(audio_url)}"
`;

  res.set("Content-Type", "application/vnd.apple.mpegurl");
  res.send(master);
});

// Video sub-playlist
app.get("/video.m3u8", (req, res) => {
  const { video_url } = req.query;
  if (!isValidUrl(video_url)) {
    return res.status(400).send("video_url must be a valid http/https URL");
  }

  const playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
${video_url}
#EXT-X-ENDLIST
`;
  res.set("Content-Type", "application/vnd.apple.mpegurl");
  res.send(playlist);
});

// Audio sub-playlist
app.get("/audio.m3u8", (req, res) => {
  const { audio_url } = req.query;
  if (!isValidUrl(audio_url)) {
    return res.status(400).send("audio_url must be a valid http/https URL");
  }

  const playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10.0,
${audio_url}
#EXT-X-ENDLIST
`;
  res.set("Content-Type", "application/vnd.apple.mpegurl");
  res.send(playlist);
});

app.listen(PORT, () => {
  console.log(`HLS wrapper server running at http://localhost:${PORT}`);
});
