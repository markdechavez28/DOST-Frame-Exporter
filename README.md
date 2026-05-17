# DOST Frame Exporter

A high-performance web application that extracts individual frames from video files at customizable frame rates and exports them as optimized ZIP files. Designed to handle videos up to 10 hours in length.

## Features

- **Large Video Support**: Process videos up to 10 hours in length (36GB upload limit)
- **Customizable FPS**: Extract frames at any rate from 2 to 60 frames per second
- **Drag-and-Drop Upload**: Intuitive drag-and-drop or click-to-select interface
- **Real-Time Progress**: Track extraction progress with live statistics and time estimates
- **Multiple Formats**: Support for MP4, MOV, AVI, MKV, WebM, and MPEG formats
- **Automatic ZIP Creation**: Frames are automatically packaged into optimized ZIP files
- **Progress Cancellation**: Cancel extraction at any time during processing
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Performance Optimized**: Automatic cleanup of old files and resource management
- **Reliable Error Handling**: Comprehensive error messages and validation

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [FFmpeg](https://ffmpeg.org/download.html) - Must be installed and accessible from system PATH

### Installing FFmpeg

**Windows:**

1. Download from https://ffmpeg.org/download.html or use a package manager
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add the `bin` folder to your system PATH environment variable
4. Verify installation: Open Command Prompt and run `ffmpeg -version`

**macOS (with Homebrew):**

```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get install ffmpeg
```

**Linux (Fedora/CentOS):**

```bash
sudo dnf install ffmpeg
```

## Installation

1. Navigate to the project directory:

```bash
cd FrameExporter
```

2. Install dependencies:

```bash
npm install
```

## Usage

### Starting the Application

1. Start the server:

```bash
npm start
```

2. Open your browser and navigate to:

```
http://localhost:3000
```

### How to Use

1. **Upload Video**: Drag and drop a video file onto the upload area or click to browse
2. **Configure FPS**: Adjust the slider or enter a custom value (2-60 frames per second)
3. **Review Estimates**: See video duration and estimated number of frames
4. **Extract Frames**: Click "Extract Frames" to begin processing
5. **Monitor Progress**: Watch real-time extraction progress with:
   - Number of frames extracted
   - Completion percentage
   - Elapsed time
   - Estimated remaining time
6. **Download ZIP**: The ZIP file automatically downloads when complete

### FPS Selection Guide

- **2-5 FPS**: Fewer frames, smaller files, faster processing
- **10-15 FPS**: Balanced extraction rate for typical use
- **30+ FPS**: More frames, larger files, suitable for detailed analysis
- **60 FPS**: Maximum frame rate for detailed frame-by-frame analysis

## Project Structure

```
FrameExporter/
├── server.js           # Express server with FFmpeg integration
├── package.json        # Dependencies and scripts
├── README.md          # This file
├── public/
│   ├── index.html     # Web interface
│   ├── styles.css     # UI styling
│   └── app.js         # Frontend JavaScript logic
├── uploads/           # Temporary storage (auto-cleaned)
├── .github/
│   └── copilot-instructions.md  # Development guide
└── .gitignore         # Git ignore patterns
```

## API Endpoints

### Health Check

```
GET /api/health
```

Returns server status and configuration.

**Response:**

```json
{
  "status": "ok",
  "message": "DOST Frame Exporter is running",
  "maxFps": 60,
  "uploadLimitGB": 36
}
```

### Get Video Information

```
POST /api/video-info
```

Analyzes video and returns metadata.

**Request:** `multipart/form-data` with video file
**Response:**

```json
{
  "duration": "123.45",
  "estimatedFrames": {
    "2": 246,
    "5": 617,
    "30": 3703,
    "60": 7406
  },
  "videoFormat": "mov,mp4,m4a,3gp,3g2,mj2"
}
```

### Extract Frames

```
POST /api/extract-frames
```

Extracts frames and returns ZIP file.

**Request:**

- `video` - Video file (multipart/form-data)
- `fps` - Frames per second (2-60)

**Response:** Binary ZIP file with extracted frames

## Performance Considerations

### For Long Videos (5-10 hours)

- Use lower FPS (2-5) to reduce processing time
- Extraction time varies based on:
  - Video resolution
  - Codec complexity
  - System CPU power
  - Disk speed

### Optimization Tips

- Use SSD for faster temporary file operations
- Ensure sufficient disk space (rough estimate: 10-50MB per minute of video)
- Close other resource-intensive applications
- Use wired internet for downloads if file is very large

### File Size Estimates

- 2 FPS: ~0.5-2 MB per minute of video
- 5 FPS: ~1-5 MB per minute of video
- 30 FPS: ~6-30 MB per minute of video
- 60 FPS: ~12-60 MB per minute of video

(Estimates vary based on video resolution and compression)

## Troubleshooting

### FFmpeg not found

- Ensure FFmpeg is installed and in system PATH
- Restart terminal/IDE after adding to PATH
- Run `ffmpeg -version` to verify installation

### Upload fails

- Check file size (maximum 36GB)
- Verify file is a valid video format
- Check available disk space

### Extraction is slow

- This is normal for long videos
- Reduce FPS setting for faster extraction
- Check CPU usage; other processes may be consuming resources

### Out of disk space

- Check available storage before uploading
- Enable automatic cleanup in server configuration
- Clear the `uploads/` directory manually

### Browser compatibility

- Tested on Chrome, Firefox, Safari, Edge
- Requires modern browser with ES6+ support
- JavaScript must be enabled

## Configuration

Environment variables (optional):

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Set to 'production' for optimized performance

## Dependencies

- **express**: Web server framework
- **multer**: Multipart file upload middleware
- **fluent-ffmpeg**: FFmpeg command-line wrapper
- **jszip**: ZIP file creation library
- **cors**: Cross-Origin Resource Sharing middleware

## Limitations

- Maximum FPS: 60 frames per second
- Maximum upload size: 36GB
- Supported formats: MP4, MOV, AVI, MKV, WebM, MPEG
- Frame format: PNG (lossless quality)

## License

MIT License - See LICENSE file for details

## Support

For issues or feature requests, please open an issue in the project repository.

## Project Information

**Prepared for:** Project Naira Bantai
**Version:** 2.0.0
**Last Updated:** 2024
