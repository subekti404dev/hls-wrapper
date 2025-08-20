import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());

/**
 * Get content-length of remote file
 */
async function getFileSize(url) {
  const resp = await fetch(url, { method: "HEAD" });
  if (!resp.ok) throw new Error(`Failed to fetch header for ${url}`);
  return Number(resp.headers.get("content-length"));
}

/**
 * Master playlist: /master.m3u8?video_url=xxx.mp4&audio_url=yyy.mp4
 */
app.get("/master.m3u8", (req, res) => {
  const { video_url, audio_url } = req.query;
  if (!video_url || !audio_url) {
    return res.status(400).send("video_url and audio_url are required");
  }

  const host = req.get("host");

  const master = `#EXTM3U
#EXT-X-VERSION:3

#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Indonesian",LANGUAGE="id",AUTOSELECT=YES,DEFAULT=YES,URI="https://${host}/audio.m3u8?url=${encodeURIComponent(
    audio_url
  )}"

#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1920x1080,CODECS="avc1.640029",AUDIO="audio"
https://${host}/video.m3u8?url=${encodeURIComponent(video_url)}
`;

  res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
  res.send(master);
});

/**
 * Sub-playlists (audio/video)
 */
app.get("/:type.m3u8", async (req, res) => {
  const { type } = req.params;
  const { url } = req.query;

  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).send("Missing or invalid ?url= parameter");
  }

  try {
    const fileSize = await getFileSize(url);
    const segmentSize = 5 * 1024 * 1024; // ~5MB per segment
    const segments = Math.ceil(fileSize / segmentSize);
    const host = req.get("host");

    let playlist = "#EXTM3U\n";
    playlist += "#EXT-X-VERSION:7\n";
    playlist += "#EXT-X-TARGETDURATION:10\n";
    playlist += "#EXT-X-MEDIA-SEQUENCE:0\n";

    for (let i = 0; i < segments; i++) {
      const start = i * segmentSize;
      const size = i === segments - 1 ? fileSize - start : segmentSize;
      playlist += `#EXTINF:10.0,\n`;
      playlist += `https://${host}/segment?url=${encodeURIComponent(
        url
      )}&start=${start}&size=${size}\n`;
    }

    playlist += "#EXT-X-ENDLIST\n";

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.send(playlist);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to generate playlist");
  }
});

/**
 * Proxy remote file ranges into "segments"
 */
app.get("/segment", async (req, res) => {
  const { url, start, size } = req.query;
  if (!url || !start || !size) {
    return res.status(400).send("Missing parameters");
  }

  const startByte = Number(start);
  const endByte = startByte + Number(size) - 1;

  try {
    const resp = await fetch(url, {
      headers: { Range: `bytes=${startByte}-${endByte}` },
    });

    if (!resp.ok && resp.status !== 206) {
      throw new Error(`Bad response from origin: ${resp.status}`);
    }

    res.setHeader("Content-Type", "video/mp4");
    resp.body.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to proxy segment");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Express HLS wrapper running on port ${PORT}`);
});
