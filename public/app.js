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
const startTimeInput = document.getElementById('startTimeInput');
const endTimeInput = document.getElementById('endTimeInput');
const startTimeHelp = document.getElementById('startTimeHelp');
const endTimeHelp = document.getElementById('endTimeHelp');
const timeframeInfo = document.getElementById('timeframeInfo');
const timeframeDisplay = document.getElementById('timeframeDisplay');
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
const progressBatchInfo = document.getElementById('progressBatchInfo');
const currentBatch = document.getElementById('currentBatch');
const totalBatches = document.getElementById('totalBatches');
const batchProgressContainer = document.getElementById('batchProgressContainer');
const batchProgressBars = document.getElementById('batchProgressBars');

let selectedVideo = null;
let videoDurationSeconds = 0;
let extractionStartTime = null;
let extractionAbortController = null;
let totalEstimatedFrames = 0;
let currentBatchCount = 0;
let totalBatchCount = 0;
let batchCompletionStatus = {}; // Track which batches are complete
let extractedFramesCount = 0; // Track extracted frames for partial download

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

// Timeframe Input Handlers
startTimeInput.addEventListener('input', validateTimeframeInputs);
endTimeInput.addEventListener('input', validateTimeframeInputs);
startTimeInput.addEventListener('blur', validateTimeframeInputs);
endTimeInput.addEventListener('blur', validateTimeframeInputs);

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
 * Convert time string (MM:SS or HH:MM:SS) to seconds
 */
function timeToSeconds(timeString) {
  if (!timeString || timeString.trim() === '') return null;
  
  const parts = timeString.trim().split(':').map(p => parseInt(p));
  
  if (parts.length === 2) {
    const [mm, ss] = parts;
    if (isNaN(mm) || isNaN(ss) || mm < 0 || ss < 0 || ss >= 60) return null;
    return mm * 60 + ss;
  } else if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    if (isNaN(hh) || isNaN(mm) || isNaN(ss) || hh < 0 || mm < 0 || ss < 0 || mm >= 60 || ss >= 60) return null;
    return hh * 3600 + mm * 60 + ss;
  }
  
  return null;
}

/**
 * Convert seconds to time string (MM:SS or HH:MM:SS)
 */
function secondsToTime(seconds) {
  if (seconds === null || seconds === undefined) return '';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Validate and sync timeframe inputs
 */
function validateTimeframeInputs() {
  const startStr = startTimeInput.value.trim();
  const endStr = endTimeInput.value.trim();
  
  startTimeHelp.textContent = '';
  endTimeHelp.textContent = '';
  timeframeInfo.style.display = 'none';
  
  // If both are empty, it's valid (use entire video)
  if (!startStr && !endStr) {
    updateEstimatedFrames();
    return true;
  }
  
  const startSeconds = timeToSeconds(startStr);
  const endSeconds = timeToSeconds(endStr);
  
  // Validate start time
  if (startStr && startSeconds === null) {
    startTimeHelp.textContent = '❌ Invalid format. Use MM:SS or HH:MM:SS';
    startTimeHelp.style.color = 'red';
    return false;
  }
  
  // Validate end time
  if (endStr && endSeconds === null) {
    endTimeHelp.textContent = '❌ Invalid format. Use MM:SS or HH:MM:SS';
    endTimeHelp.style.color = 'red';
    return false;
  }
  
  // Validate ranges
  if (startSeconds !== null && startSeconds >= videoDurationSeconds) {
    startTimeHelp.textContent = `❌ Start time exceeds video duration (${formatDuration(videoDurationSeconds)})`;
    startTimeHelp.style.color = 'red';
    return false;
  }
  
  if (endSeconds !== null && endSeconds > videoDurationSeconds) {
    endTimeHelp.textContent = `❌ End time exceeds video duration (${formatDuration(videoDurationSeconds)})`;
    endTimeHelp.style.color = 'red';
    return false;
  }
  
  if (startSeconds !== null && endSeconds !== null && startSeconds >= endSeconds) {
    endTimeHelp.textContent = '❌ End time must be after start time';
    endTimeHelp.style.color = 'red';
    return false;
  }
  
  // Valid - update display
  if (startSeconds !== null || endSeconds !== null) {
    const start = startSeconds !== null ? startSeconds : 0;
    const end = endSeconds !== null ? endSeconds : videoDurationSeconds;
    const duration = end - start;
    const fps = parseInt(fpsInput.value);
    const frames = Math.ceil(duration * fps);
    
    totalEstimatedFrames = frames;
    estimatedFrames.textContent = frames.toLocaleString();
    
    timeframeDisplay.textContent = `${secondsToTime(start)} to ${secondsToTime(end)} (${formatDuration(duration)})`;
    timeframeInfo.style.display = 'block';
  } else {
    updateEstimatedFrames();
  }
  
  return true;
}

/**
 * Extract frames with progress tracking and batch-aware progress bar
 */
async function extractFrames(fps) {
  if (!selectedVideo) return;

  // Validate timeframe inputs
  if (!validateTimeframeInputs()) {
    showStatus('Please fix timeframe errors', 'error');
    return;
  }

  extractBtn.disabled = true;
  extractionAbortController = new AbortController();
  extractionStartTime = Date.now();
  extractedFramesCount = 0;
  currentBatchCount = 0;
  batchCompletionStatus = {};
  
  showProgress();
  updateProgressDisplay(0, 0);
  
  // Get timeframe parameters
  const startStr = startTimeInput.value.trim();
  const endStr = endTimeInput.value.trim();
  const startTime = timeToSeconds(startStr) || 0;
  const endTime = timeToSeconds(endStr) || videoDurationSeconds;
  const extractDuration = endTime - startTime;

  // Calculate number of batches
  totalBatchCount = Math.ceil(extractDuration / 30);
  currentBatch.textContent = '0';
  totalBatches.textContent = totalBatchCount;
  progressBatchInfo.style.display = 'block';
  
  // Initialize batch progress bars
  initializeBatchProgressBars(totalBatchCount);

  progressMessage.textContent = `Processing video in ${totalBatchCount} batches of 30 seconds each...`;

  try {
    const formData = new FormData();
    formData.append('video', selectedVideo);
    formData.append('fps', fps);
    formData.append('startTime', startTime);
    formData.append('endTime', endTime);

    const response = await fetch('/api/extract-frames', {
      method: 'POST',
      body: formData,
      signal: extractionAbortController.signal
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to extract frames');
    }

    // Handle batch progress updates via Server-Sent Events or polling
    // For now, we'll handle the response as a stream for progress tracking
    const reader = response.body.getReader();
    const chunks = [];
    let lastUpdateTime = Date.now();
    let batchUpdateQueue = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        
        // Parse SSE events if they're sent
        const text = new TextDecoder().decode(value);
        parseProgressEvents(text, batchCompletionStatus);
        
        // Update progress based on data received
        const totalSize = response.headers.get('content-length');
        if (totalSize) {
          const receivedSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const percentReceived = Math.round((receivedSize / totalSize) * 100);
          
          // Update every 500ms to avoid excessive updates
          const now = Date.now();
          if (now - lastUpdateTime > 500) {
            updateBatchProgressDisplay(batchCompletionStatus);
            progressMessage.textContent = `Processing... Download: ${percentReceived}%`;
            lastUpdateTime = now;
          }
        }
      }
    } catch (streamError) {
      if (streamError.name !== 'AbortError') {
        throw streamError;
      }
    }

    // Combine chunks and create blob
    const blob = new Blob(chunks);
    
    // Check if we have partial results
    const hasPartialResults = Object.keys(batchCompletionStatus).some(k => batchCompletionStatus[k]);
    
    if (blob.size > 0) {
      downloadBlob(blob, fps);
      hideProgress();
      
      if (extractionAbortController.signal.aborted) {
        if (hasPartialResults) {
          showStatus('Extraction cancelled. Partial frames downloaded!', 'warning');
        } else {
          showStatus('Extraction cancelled', 'error');
        }
      } else {
        showStatus('Frames extracted and downloaded successfully!', 'success');
      }
      
      setTimeout(() => {
        hideStatus();
      }, 5000);
    } else {
      hideProgress();
      showStatus('No frames extracted', 'error');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      // User cancelled - still offer partial download if available
      const response = event.target?.response;
      if (response && response.size > 0) {
        downloadBlob(response, fps);
        hideProgress();
        showStatus('Extraction cancelled. Partial frames downloaded!', 'warning');
      } else {
        hideProgress();
        showStatus('Extraction cancelled by user', 'error');
      }
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
 * Initialize batch progress bar visualization
 */
function initializeBatchProgressBars(batchCount) {
  batchProgressBars.innerHTML = '';
  batchProgressContainer.style.display = 'block';
  
  for (let i = 0; i < batchCount; i++) {
    const batchBar = document.createElement('div');
    batchBar.className = 'batch-progress-bar';
    batchBar.id = `batch-${i}`;
    batchBar.style.flex = `1`;
    batchBar.style.height = '8px';
    batchBar.style.margin = '2px';
    batchBar.style.backgroundColor = '#e0e0e0';
    batchBar.style.borderRadius = '4px';
    batchBar.style.transition = 'background-color 0.3s ease';
    batchProgressBars.appendChild(batchBar);
  }
}

/**
 * Parse batch progress events from server
 */
function parseProgressEvents(text, statusObj) {
  const lines = text.split('\n');
  lines.forEach(line => {
    if (line.startsWith('batch:')) {
      try {
        const batchNum = parseInt(line.substring(6).trim());
        statusObj[batchNum] = true;
      } catch (e) {}
    }
  });
}

/**
 * Update batch progress display
 */
function updateBatchProgressDisplay(statusObj) {
  let completedCount = 0;
  Object.keys(statusObj).forEach(batchNum => {
    if (statusObj[batchNum]) {
      const batchBar = document.getElementById(`batch-${batchNum}`);
      if (batchBar) {
        batchBar.style.backgroundColor = '#4CAF50';
      }
      completedCount++;
    }
  });
  
  currentBatch.textContent = completedCount;
  const overallPercent = Math.round((completedCount / totalBatchCount) * 100);
  updateProgressDisplay(extractedFramesCount, overallPercent);
}

/**
 * Download blob to file
 */
function downloadBlob(blob, fps) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `frames_${fps}fps.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
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

