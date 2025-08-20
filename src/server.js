import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Simple URL validator
const isValidUrl = (str) => {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// Master playlist generator
app.get("/master.m3u8", (req, res) => {
  const { video_url, audio_url } = req.query;

  if (!isValidUrl(video_url) || !isValidUrl(audio_url)) {
    return res
      .status(400)
      .send("video_url and audio_url must be valid http/https URLs");
  }

  const host = "https://" + req.get("host");

  const master = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="id",NAME="Indonesian",DEFAULT=YES,AUTOSELECT=YES,URI="${host}/audio.m3u8?url=${encodeURIComponent(
    audio_url
  )}"
#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2",AUDIO="audio"
${host}/video.m3u8?url=${encodeURIComponent(video_url)}
`;

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.send(master);
});

// Video sub-playlist
app.get("/video.m3u8", (req, res) => {
  const { url } = req.query;
  if (!isValidUrl(url)) return res.status(400).send("Invalid video URL");

  const host = "https://" + req.get("host");
  const playlist = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:0,
${host}/proxy?url=${encodeURIComponent(url)}
#EXT-X-ENDLIST`;

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.send(playlist);
});

// Audio sub-playlist
app.get("/audio.m3u8", (req, res) => {
  const { url } = req.query;
  if (!isValidUrl(url)) return res.status(400).send("Invalid audio URL");

  const host = "https://" + req.get("host");
  const playlist = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-TARGETDURATION:10
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:0,
${host}/proxy?url=${encodeURIComponent(url)}
#EXT-X-ENDLIST`;

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.send(playlist);
});

// Proxy with Range support
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!isValidUrl(targetUrl)) {
    return res.status(400).send("Invalid URL");
  }

  try {
    const headers = {};
    if (req.headers.range) {
      headers["Range"] = req.headers.range; // forward byte range
    }

    const response = await fetch(targetUrl, { headers });

    // Mirror status + headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Pipe body to response
    if (response.body) {
      response.body.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    res.status(500).send("Proxy error: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
