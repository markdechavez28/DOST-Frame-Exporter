# DOST Frame Exporter - Development Guide

## Project Overview
DOST Frame Exporter is a web application that extracts video frames at user-specified FPS rates and exports them as ZIP files.

## Technology Stack
- **Backend**: Node.js + Express.js
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Video Processing**: FFmpeg (via fluent-ffmpeg)
- **Compression**: JSZip

## Key Features
1. Video upload with drag-and-drop support
2. Adjustable frame extraction (2, 3, 4, 5 FPS)
3. Real-time video analysis
4. Automatic ZIP download
5. Large file support (up to 5GB)

## Getting Started
1. Install dependencies: `npm install`
2. Ensure FFmpeg is installed on your system
3. Start server: `npm start`
4. Visit: `http://localhost:3000`

## Project File Structure
- `server.js` - Main Express server and API endpoints
- `public/index.html` - Web interface
- `public/styles.css` - UI styling
- `public/app.js` - Frontend logic
- `uploads/` - Temporary file storage
- `package.json` - Dependencies configuration

## Development Notes
- Frame extraction is CPU-intensive; consider implementing a queue system for multiple simultaneous requests
- Current implementation stores temporary frames in memory before zipping
- Consider adding progress tracking for long video processing
- FFmpeg must be in system PATH for the application to work

## Next Steps for Enhancement
- Add progress bar for frame extraction
- Implement request queuing for concurrent uploads
- Add video format conversion options
- Add frame format options (JPG, PNG, WebP)
- Implement cloud storage integration
