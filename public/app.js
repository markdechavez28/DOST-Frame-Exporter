// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const videoInput = document.getElementById('videoInput');
const videoInfo = document.getElementById('videoInfo');
const videoFileName = document.getElementById('videoFileName');
const videoDuration = document.getElementById('videoDuration');
const estimatedFrames = document.getElementById('estimatedFrames');
const fpsSlider = document.getElementById('fpsSlider');
const fpsInput = document.getElementById('fpsInput');
const fpsDescription = document.getElementById('fpsDescription');
const extractBtn = document.getElementById('extractBtn');
const cancelBtn = document.getElementById('cancelBtn');
const status = document.getElementById('status');
const progressContainer = document.getElementById('progressContainer');
const framesExtracted = document.getElementById('framesExtracted');
const progressPercent = document.getElementById('progressPercent');
const elapsedTime = document.getElementById('elapsedTime');
const estimatedRemaining = document.getElementById('estimatedRemaining');
const progressFill = document.getElementById('progressFill');
const progressMessage = document.getElementById('progressMessage');

let selectedVideo = null;
let videoDurationSeconds = 0;
let extractionStartTime = null;
let extractionAbortController = null;
let totalEstimatedFrames = 0;

// Upload Area Click Handler
uploadArea.addEventListener('click', () => {
  videoInput.click();
});

// File Input Change Handler
videoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleVideoSelected(file);
  }
});

// Drag and Drop Handlers
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];
    if (file.type.startsWith('video/')) {
      videoInput.files = files;
      handleVideoSelected(file);
    } else {
      showStatus('Please drop a valid video file', 'error');
    }
  }
});

// FPS Slider and Input Synchronization
fpsSlider.addEventListener('input', (e) => {
  fpsInput.value = e.target.value;
  updateFpsDescription();
  updateEstimatedFrames();
});

fpsInput.addEventListener('input', (e) => {
  let value = parseInt(e.target.value);
  if (isNaN(value)) return;
  
  if (value < 2) value = 2;
  if (value > 60) value = 60;
  
  fpsInput.value = value;
  fpsSlider.value = value;
  updateFpsDescription();
  updateEstimatedFrames();
});

// FPS Input validation on blur
fpsInput.addEventListener('blur', (e) => {
  let value = parseInt(e.target.value);
  if (isNaN(value) || value < 2) {
    fpsInput.value = 2;
    fpsSlider.value = 2;
  } else if (value > 60) {
    fpsInput.value = 60;
    fpsSlider.value = 60;
  }
  updateFpsDescription();
  updateEstimatedFrames();
});

// Extract Frames Handler
extractBtn.addEventListener('click', async () => {
  if (!selectedVideo) {
    showStatus('Please select a video first', 'error');
    return;
  }

  const fps = parseInt(fpsInput.value);
  await extractFrames(fps);
});

// Cancel Extraction Handler
cancelBtn.addEventListener('click', () => {
  if (extractionAbortController) {
    extractionAbortController.abort();
    hideProgress();
    showStatus('Extraction cancelled', 'error');
    extractBtn.disabled = false;
  }
});

/**
 * Handle video selected
 */
async function handleVideoSelected(file) {
  selectedVideo = file;
  updateUploadAreaText();

  showStatus('Analyzing video...', 'processing');

  try {
    const videoMetadata = await getVideoInfo(file);
    videoDurationSeconds = parseFloat(videoMetadata.duration);
    videoFileName.textContent = file.name;
    videoDuration.textContent = formatDuration(videoDurationSeconds);
    videoInfo.style.display = 'block';
    updateEstimatedFrames();
    extractBtn.disabled = false;
    showStatus('Video loaded successfully!', 'success');

    setTimeout(() => {
      hideStatus();
    }, 3000);
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
    selectedVideo = null;
    extractBtn.disabled = true;
  }
}

/**
 * Get video information
 */
async function getVideoInfo(file) {
  const formData = new FormData();
  formData.append('video', file);

  try {
    const response = await fetch('/api/video-info', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get video info');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

/**
 * Update FPS description
 */
function updateFpsDescription() {
  const fps = parseInt(fpsInput.value);
  let description = `${fps} frames per second`;
  
  if (fps <= 2) {
    description += ' (slow extraction, fewer frames)';
  } else if (fps >= 5) {
    description += ' (fast extraction, many frames)';
  }
  
  fpsDescription.textContent = description;
}

/**
 * Update estimated frames based on selected FPS
 */
function updateEstimatedFrames() {
  if (!selectedVideo || videoDurationSeconds === 0) return;

  const fps = parseInt(fpsInput.value);
  const frames = Math.ceil(videoDurationSeconds * fps);
  totalEstimatedFrames = frames;
  estimatedFrames.textContent = frames.toLocaleString();
}

/**
 * Update upload area text
 */
function updateUploadAreaText() {
  const fileName = selectedVideo.name;
  const fileSize = (selectedVideo.size / (1024 * 1024)).toFixed(2);
  uploadArea.innerHTML = `
    <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
    <p class="upload-text">Video Selected</p>
    <p class="upload-hint">${fileName} (${fileSize} MB)</p>
  `;
}

/**
 * Extract frames with progress tracking
 */
async function extractFrames(fps) {
  if (!selectedVideo) return;

  extractBtn.disabled = true;
  extractionAbortController = new AbortController();
  extractionStartTime = Date.now();
  
  showProgress();
  updateProgressDisplay(0, 0);

  try {
    const formData = new FormData();
    formData.append('video', selectedVideo);
    formData.append('fps', fps);

    const response = await fetch('/api/extract-frames', {
      method: 'POST',
      body: formData,
      signal: extractionAbortController.signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract frames');
    }

    // Handle the response as a stream for progress tracking
    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      
      // Update progress based on data received
      const totalSize = response.headers.get('content-length');
      if (totalSize) {
        const receivedSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const percentReceived = Math.round((receivedSize / totalSize) * 100);
        // Note: This is download progress, not extraction progress
      }
    }

    // Combine chunks and create blob
    const blob = new Blob(chunks);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `frames_${fps}fps.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    hideProgress();
    showStatus('Frames extracted and downloaded successfully!', 'success');
    setTimeout(() => {
      hideStatus();
    }, 5000);
  } catch (error) {
    if (error.name === 'AbortError') {
      hideProgress();
      showStatus('Extraction cancelled by user', 'error');
    } else {
      hideProgress();
      showStatus(`Error: ${error.message}`, 'error');
    }
  } finally {
    extractBtn.disabled = false;
    extractionAbortController = null;
  }
}

/**
 * Show progress container
 */
function showProgress() {
  progressContainer.style.display = 'block';
  status.style.display = 'none';
}

/**
 * Hide progress container
 */
function hideProgress() {
  progressContainer.style.display = 'none';
}

/**
 * Update progress display
 */
function updateProgressDisplay(framesCount, percentComplete) {
  framesExtracted.textContent = framesCount.toLocaleString();
  progressPercent.textContent = `${percentComplete}%`;
  progressFill.style.width = `${percentComplete}%`;

  const elapsedSeconds = Math.floor((Date.now() - extractionStartTime) / 1000);
  elapsedTime.textContent = formatSeconds(elapsedSeconds);

  if (percentComplete > 0 && percentComplete < 100) {
    const framesPerSecond = framesCount / (elapsedSeconds || 1);
    const remainingFrames = totalEstimatedFrames - framesCount;
    const estimatedSecondsRemaining = Math.ceil(remainingFrames / framesPerSecond);
    estimatedRemaining.textContent = formatSeconds(estimatedSecondsRemaining);
  } else {
    estimatedRemaining.textContent = '--';
  }
}

/**
 * Format duration in seconds to human readable format
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Format seconds to human readable format
 */
function formatSeconds(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${secs}s`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

/**
 * Show status message
 */
function showStatus(message, type) {
  status.innerHTML = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
}

/**
 * Hide status message
 */
function hideStatus() {
  status.style.display = 'none';
}

// Initial state
extractBtn.disabled = true;
updateFpsDescription();

