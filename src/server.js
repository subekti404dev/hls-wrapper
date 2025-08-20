import express from "express";
return res.status(400).send("video_url and audio_url must be valid http/https URLs");
}


const v = encodeURIComponent(video_url);
const a = encodeURIComponent(audio_url);


// BANDWIDTH is indicative; adjust to match your actual stream bitrate
const master = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,CODECS="avc1.4d401f",AUDIO="audio-aac"
video.m3u8?video_url=${v}
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-aac",NAME="Indonesian",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="id",URI="audio.m3u8?audio_url=${a}"
`;


setHlsHeaders(res);
res.send(master);
});


/**
* Video sub-playlist
* /video.m3u8?video_url=...
* Wraps a single MP4 as a VOD playlist (no segmentation)
*/
app.get("/video.m3u8", (req, res) => {
    const { video_url } = req.query;
    if (!video_url) return res.status(400).send("Missing video_url");
    if (!isHttpUrl(video_url)) return res.status(400).send("video_url must be valid http/https URL");


    const playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:99999
#EXTINF:99999,
${video_url}
#EXT-X-ENDLIST
`;
    setHlsHeaders(res);
    res.send(playlist);
});


/**
* Audio sub-playlist
* /audio.m3u8?audio_url=...
* Wraps a single MP4 (audio-only) as a VOD playlist (no segmentation)
*/
app.get("/audio.m3u8", (req, res) => {
    const { audio_url } = req.query;
    if (!audio_url) return res.status(400).send("Missing audio_url");
    if (!isHttpUrl(audio_url)) return res.status(400).send("audio_url must be valid http/https URL");


    const playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-TARGETDURATION:99999
#EXTINF:99999,
${audio_url}
#EXT-X-ENDLIST
`;
    setHlsHeaders(res);
    res.send(playlist);
});


app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "express-hls-wrapper" });
});


app.listen(PORT, () => {
    console.log(`HLS server running at http://0.0.0.0:${PORT}`);
});