const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(bodyParser.json({ limit: "20mb" }));

app.post("/convert", async (req, res) => {
  const { base64Audio, format } = req.body;

  if (!base64Audio || !format) {
    return res.status(400).json({ success: false, message: "Missing base64Audio or format" });
  }

  const id = uuidv4();
  const inputPath = `/tmp/${id}.pcm`;
  const outputPath = `/tmp/${id}.${format}`;

  try {
    // Decode base64 and write PCM file
    fs.writeFileSync(inputPath, Buffer.from(base64Audio, "base64"));

    // FFmpeg conversion
    const ffmpegCmd = `ffmpeg -f s16le -ar 24000 -ac 1 -i ${inputPath} ${outputPath}`;
    exec(ffmpegCmd, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ success: false, message: "FFmpeg error", error: stderr });
      }

      const outputBuffer = fs.readFileSync(outputPath);
      const base64Output = outputBuffer.toString("base64");

      // Cleanup
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);

      return res.json({
        success: true,
        mime: `audio/${format === "mp3" ? "mpeg" : format}`,
        data: base64Output
      });
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Processing failed", error: err.message });
  }
});

app.get("/", (req, res) => {
  res.send("FFmpeg Audio Converter API is live 🚀");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
