const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const JSZip = require('jszip');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   DIRECTORIES
========================= */

const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* =========================
   MULTER CONFIG
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix =
      Date.now() + '-' + Math.round(Math.random() * 1e9);

    cb(
      null,
      uniqueSuffix + path.extname(file.originalname)
    );
  }
});

/* =========================
   LIMITS
========================= */

// Adjust upload limit based on environment
// Production: 500MB, Local: 36GB
const UPLOAD_LIMIT = process.env.NODE_ENV === 'production' 
  ? 500 * 1024 * 1024  // 500MB for production
  : 36 * 1024 * 1024 * 1024;  // 36GB for local

/* =========================
   FILE FILTER
========================= */

const allowedExtensions = [
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.mpeg',
  '.mpg'
];

const upload = multer({
  storage,

  limits: {
    fileSize: UPLOAD_LIMIT
  },

  fileFilter: (req, file, cb) => {
    try {
      console.log('Mime:', file.mimetype);
      console.log('Name:', file.originalname);

      const ext = path
        .extname(file.originalname)
        .toLowerCase();

      if (allowedExtensions.includes(ext)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            'Invalid file format. Please upload a supported video.'
          )
        );
      }
    } catch (error) {
      cb(error);
    }
  }
});

/* =========================
   MIDDLEWARE
========================= */

app.use(cors());

app.use(express.static('public'));

app.use(
  express.json({
    limit: '50gb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '50gb'
  })
);

/* =========================
   FFMPEG
========================= */

// Detect environment and set FFmpeg paths accordingly
let ffmpegPath, ffprobePath;

const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT_NAME;
const isWindows = process.platform === 'win32';

console.log('Environment detection:');
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  RAILWAY_ENVIRONMENT_NAME:', process.env.RAILWAY_ENVIRONMENT_NAME);
console.log('  isProduction:', isProduction);
console.log('  isWindows:', isWindows);
console.log('  platform:', process.platform);

if (!isWindows) {
  // On Railway/Linux/Unix, use system PATH
  console.log('Using system FFmpeg from PATH (non-Windows environment)');
} else {
  // Local Windows development - use bundled FFmpeg
  ffmpegPath = path.join(
    __dirname,
    'ffmpeg',
    'bin',
    'ffmpeg.exe'
  );

  ffprobePath = path.join(
    __dirname,
    'ffmpeg',
    'bin',
    'ffprobe.exe'
  );

  console.log('FFmpeg path:', ffmpegPath);
  console.log('FFmpeg exists:', fs.existsSync(ffmpegPath));

  console.log('FFprobe path:', ffprobePath);
  console.log('FFprobe exists:', fs.existsSync(ffprobePath));

  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
}

// Verify FFmpeg is available
const { execSync } = require('child_process');
try {
  const result = execSync('ffmpeg -version', { stdio: 'pipe' }).toString();
  console.log('✓ FFmpeg is available on system');
} catch (e) {
  console.warn('⚠ WARNING: FFmpeg may not be available on system PATH');
}

try {
  const result = execSync('ffprobe -version', { stdio: 'pipe' }).toString();
  console.log('✓ FFprobe is available on system');
} catch (e) {
  console.warn('⚠ WARNING: FFprobe may not be available on system PATH');
}

/* =========================
   CONSTANTS
========================= */

const MAX_FPS = 60;
const MIN_FPS = 2;

const FRAME_QUALITY = 8;

const ZIP_COMPRESSION_LEVEL = 6;

const BATCH_DURATION = 30; // seconds per batch

/* =========================
   CLEANUP
========================= */

const CLEANUP_INTERVAL =
  6 * 60 * 60 * 1000;

const FILE_RETENTION_TIME =
  24 * 60 * 60 * 1000;

setInterval(() => {
  cleanupOldFiles();
}, CLEANUP_INTERVAL);

function cleanupOldFiles() {
  if (!fs.existsSync(uploadsDir)) return;

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error('Cleanup error:', err);
      return;
    }

    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(
        uploadsDir,
        file
      );

      fs.stat(filePath, (err, stats) => {
        if (err) return;

        if (
          now - stats.mtimeMs >
          FILE_RETENTION_TIME
        ) {
          fs.rm(
            filePath,
            {
              recursive: true,
              force: true
            },
            (err) => {
              if (err) {
                console.error(
                  'Cleanup error:',
                  err
                );
              } else {
                console.log(
                  'Removed old file:',
                  file
                );
              }
            }
          );
        }
      });
    });
  });
}

/* =========================
   HEALTH CHECK
========================= */

app.get('/api/health', (req, res) => {
  // Test if FFmpeg/FFprobe are available
  let ffmpegAvailable = false;
  let ffprobeAvailable = false;
  
  try {
    execSync('ffmpeg -version', { stdio: 'pipe' });
    ffmpegAvailable = true;
  } catch (e) {
    console.error('FFmpeg not available:', e.message);
  }
  
  try {
    execSync('ffprobe -version', { stdio: 'pipe' });
    ffprobeAvailable = true;
  } catch (e) {
    console.error('FFprobe not available:', e.message);
  }

  res.json({
    status: 'ok',
    message:
      'DOST Frame Exporter is running',
    maxFps: MAX_FPS,
    uploadLimitGB:
      UPLOAD_LIMIT /
      (1024 * 1024 * 1024),
    ffmpeg: {
      available: ffmpegAvailable,
      status: ffmpegAvailable ? 'Ready' : 'Not found on system PATH'
    },
    ffprobe: {
      available: ffprobeAvailable,
      status: ffprobeAvailable ? 'Ready' : 'Not found on system PATH'
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'not set',
      platform: process.platform,
      isRailway: !!process.env.RAILWAY_ENVIRONMENT_NAME
    }
  });
});

/* =========================
   VIDEO INFO
========================= */

app.post(
  '/api/video-info',
  upload.single('video'),
  (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error:
            'No video file provided'
        });
      }

      const videoPath = req.file.path;
      
      console.log('Processing video file:', videoPath);
      
      // Set a timeout for ffprobe to avoid hanging
      let probeCompleted = false;
      const timeoutId = setTimeout(() => {
        if (!probeCompleted && !res.headersSent) {
          console.error('FFprobe timeout - operation took longer than 30 seconds');
          probeCompleted = true;
          try {
            fs.unlinkSync(videoPath);
          } catch (e) {}
          return res.status(500).json({
            error:
              'Video analysis timed out. FFmpeg/FFprobe may not be available on the server.'
          });
        }
      }, 30000); // 30 second timeout

      ffmpeg.ffprobe(
        videoPath,
        (err, metadata) => {
          probeCompleted = true;
          clearTimeout(timeoutId);
          
          try {
            fs.unlinkSync(videoPath);
          } catch (e) {}

          if (err) {
            console.error(
              'FFprobe error:',
              err.message || err
            );

            return res.status(400).json({
              error:
                'Unable to read video file: ' + (err.message || err)
            });
          }

          const duration =
            metadata.format.duration;

          if (
            !duration ||
            duration <= 0
          ) {
            return res.status(400).json({
              error:
                'Invalid video duration'
            });
          }

          const estimatedFrames = {};

          for (
            let fps = MIN_FPS;
            fps <= MAX_FPS;
            fps++
          ) {
            estimatedFrames[fps] =
              Math.ceil(duration * fps);
          }

          res.json({
            duration:
              duration.toFixed(2),

            estimatedFrames,

            videoFormat:
              metadata.format.format_name
          });
        }
      );
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error:
          'Failed to get video info'
      });
    }
  }
);

/* =========================
   EXTRACT FRAMES
========================= */

app.post(
  '/api/extract-frames',
  upload.single('video'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error:
            'No video file uploaded'
        });
      }

      const fps = parseInt(
        req.body.fps
      );

      if (
        isNaN(fps) ||
        fps < MIN_FPS ||
        fps > MAX_FPS
      ) {
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          error: `FPS must be between ${MIN_FPS} and ${MAX_FPS}`
        });
      }

      // Parse timeframe parameters
      const startTime = parseFloat(req.body.startTime) || 0;
      const endTime = parseFloat(req.body.endTime) || null;

      if (startTime < 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: 'Start time cannot be negative'
        });
      }

      if (endTime !== null && endTime < startTime) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: 'End time must be after start time'
        });
      }

      const videoPath =
        req.file.path;

      const sessionId =
        Date.now() +
        '-' +
        Math.random()
          .toString(36)
          .substring(2, 9);

      const outputDir = path.join(
        uploadsDir,
        `frames-${sessionId}`
      );

      fs.mkdirSync(outputDir, {
        recursive: true
      });

      // Use batch extraction with timeframe parameters
      await extractFramesBatch(
        videoPath,
        outputDir,
        fps,
        startTime,
        endTime,
        res // Pass response for SSE events
      );

      const zipPath =
        await createZip(
          outputDir,
          `frames_${fps}fps`,
          sessionId
        );

      res.setHeader(
        'Content-Type',
        'application/zip'
      );

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="frames_${fps}fps.zip"`
      );

      res.download(
        zipPath,
        `frames_${fps}fps.zip`,
        (err) => {
          if (
            err &&
            err.code !==
              'ERR_HTTP_HEADERS_SENT'
          ) {
            console.error(
              'Download error:',
              err
            );
          }

          setTimeout(() => {
            cleanupSession(
              outputDir,
              videoPath,
              zipPath
            );
          }, 3000);
        }
      );
    } catch (error) {
      console.error(error);

      if (req.file) {
        try {
          fs.unlinkSync(
            req.file.path
          );
        } catch (e) {}
      }

      if (!res.headersSent) {
        res.status(500).json({
          error:
            error.message ||
            'Extraction failed'
        });
      }
    }
  }
);

/* =========================
   EXTRACT FUNCTION
========================= */

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    let probeCompleted = false;
    
    // Set a 30 second timeout
    const timeoutId = setTimeout(() => {
      if (!probeCompleted) {
        probeCompleted = true;
        reject(new Error('FFprobe timeout - could not read video duration within 30 seconds'));
      }
    }, 30000);
    
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (probeCompleted) return; // Timeout already occurred
      
      probeCompleted = true;
      clearTimeout(timeoutId);
      
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

function extractFramesBatch(
  videoPath,
  outputDir,
  fps,
  startTime = 0,
  endTime = null,
  res = null
) {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Getting video duration...');
      const videoDuration = await getVideoDuration(videoPath);
      console.log('Video duration obtained:', videoDuration);
      
      // Validate and adjust timeframe
      let extractStartTime = Math.max(0, startTime);
      let extractEndTime = endTime !== null ? Math.min(endTime, videoDuration) : videoDuration;
      let extractDuration = extractEndTime - extractStartTime;

      if (extractDuration <= 0) {
        throw new Error('Invalid timeframe: end time must be after start time');
      }

      const totalBatches = Math.ceil(extractDuration / BATCH_DURATION);
      
      console.log(`Extracting frames from ${extractStartTime}s to ${extractEndTime}s (duration: ${extractDuration}s)`);
      console.log(`Video duration: ${videoDuration}s, Total batches: ${totalBatches}`);

      let frameCounter = 0;
      let completedBatches = 0;

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Calculate batch start time based on extract window
        const batchStartTime = extractStartTime + (batchIndex * BATCH_DURATION);
        const batchDuration = Math.min(BATCH_DURATION, extractEndTime - batchStartTime);

        console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${batchStartTime}s - ${batchStartTime + batchDuration}s)`);

        await new Promise((batchResolve, batchReject) => {
          const framePattern = path.join(
            outputDir,
            'frame_%06d.png'
          );

          ffmpeg(videoPath)
            .seek(batchStartTime)
            .duration(batchDuration)
            .outputOptions([
              `-vf fps=${fps}`,
              `-q:v ${FRAME_QUALITY}`,
              '-c:v png'
            ])
            .output(framePattern)
            .on('end', () => {
              completedBatches++;
              console.log(`Batch ${batchIndex + 1} completed`);
              
              // Send SSE event if response object is available
              if (res && !res.writableEnded) {
                res.write(`batch:${batchIndex}\n`);
              }
              
              batchResolve();
            })
            .on('error', (err) => {
              batchReject(err);
            })
            .run();
        });
      }

      console.log('All batches extraction completed');
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function extractFrames(
  videoPath,
  outputDir,
  fps
) {
  return new Promise(
    (resolve, reject) => {
      const framePattern =
        path.join(
          outputDir,
          'frame_%06d.png'
        );

      ffmpeg(videoPath)
        .outputOptions([
          `-vf fps=${fps}`,
          `-q:v ${FRAME_QUALITY}`,
          '-c:v png'
        ])

        .output(framePattern)

        .on(
          'start',
          (commandLine) => {
            console.log(
              'FFmpeg started:',
              commandLine
            );
          }
        )

        .on(
          'progress',
          (progress) => {
            console.log(
              `Progress: ${
                progress.percent?.toFixed(
                  2
                ) || 0
              }%`
            );
          }
        )

        .on('end', () => {
          console.log(
            'Extraction completed'
          );

          resolve();
        })

        .on('error', (err) => {
          console.error(
            'FFmpeg error:',
            err
          );

          reject(
            new Error(
              `FFmpeg extraction failed: ${err.message}`
            )
          );
        })

        .run();
    }
  );
}

/* =========================
   ZIP FUNCTION
========================= */

async function createZip(
  frameDir,
  zipName,
  sessionId
) {
  try {
    const zip = new JSZip();

    const files = fs
      .readdirSync(frameDir)
      .sort();

    console.log(
      `Creating ZIP with ${files.length} frames`
    );

    for (const file of files) {
      const filePath = path.join(
        frameDir,
        file
      );

      const content =
        fs.readFileSync(filePath);

      zip.file(file, content);
    }

    const buffer =
      await zip.generateAsync({
        type: 'nodebuffer',

        compression:
          'DEFLATE',

        compressionOptions: {
          level:
            ZIP_COMPRESSION_LEVEL
        }
      });

    const zipPath = path.join(
      uploadsDir,
      `${zipName}-${sessionId}.zip`
    );

    fs.writeFileSync(
      zipPath,
      buffer
    );

    return zipPath;
  } catch (error) {
    throw new Error(
      `ZIP creation failed: ${error.message}`
    );
  }
}

/* =========================
   CLEANUP SESSION
========================= */

function cleanupSession(
  outputDir,
  videoPath,
  zipPath
) {
  try {
    if (
      fs.existsSync(outputDir)
    ) {
      fs.rmSync(outputDir, {
        recursive: true,
        force: true
      });
    }

    if (
      fs.existsSync(videoPath)
    ) {
      fs.unlinkSync(videoPath);
    }

    setTimeout(() => {
      if (
        fs.existsSync(zipPath)
      ) {
        fs.unlinkSync(zipPath);
      }
    }, 60000);
  } catch (error) {
    console.error(
      'Cleanup error:',
      error
    );
  }
}

/* =========================
   ERROR HANDLER
========================= */

app.use(
  (err, req, res, next) => {
    console.error(
      'Unhandled error:',
      err
    );

    if (
      err instanceof
      multer.MulterError
    ) {
      if (
        err.code ===
        'LIMIT_FILE_SIZE'
      ) {
        return res
          .status(413)
          .json({
            error: `File too large. Maximum is ${
              UPLOAD_LIMIT /
              (1024 *
                1024 *
                1024)
            }GB`
          });
      }

      return res
        .status(400)
        .json({
          error: err.message
        });
    }

    res.status(500).json({
      error:
        err.message ||
        'Internal server error'
    });
  }
);

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

/* =========================
   START SERVER
========================= */

const server = app.listen(
  PORT,
  () => {
    console.log(
      `Server running at http://localhost:${PORT}`
    );

    console.log(
      `Upload limit: ${
        UPLOAD_LIMIT /
        (1024 * 1024 * 1024)
      }GB`
    );
  }
);

/* =========================
   SERVER ERROR
========================= */

server.on('error', (err) => {
  console.error(
    'Server error:',
    err
  );

  process.exit(1);
});

/* =========================
   GRACEFUL SHUTDOWN
========================= */

process.on('SIGTERM', () => {
  console.log(
    'SIGTERM received'
  );

  server.close(() => {
    console.log(
      'Server closed'
    );

    process.exit(0);
  });
});