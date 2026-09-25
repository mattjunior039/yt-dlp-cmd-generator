document.addEventListener('DOMContentLoaded', async () => {
  // Basic Elements
  const urlInput = document.getElementById('url');
  
  const downloadMode = document.getElementById('downloadMode');
  const customVideoOptions = document.getElementById('customVideoOptions');
  const resolutionSelect = document.getElementById('resolution');
  const videoFormatSelect = document.getElementById('videoFormat');
  
  const audioOptions = document.getElementById('audioOptions');
  const audioFormatSelect = document.getElementById('audioFormat');
  
  const playlistToggle = document.getElementById('playlistToggle');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  
  // Advanced Elements
  const embedSubs = document.getElementById('embedSubs');
  const writeAutoSubs = document.getElementById('writeAutoSubs');
  const embedMetadata = document.getElementById('embedMetadata');
  const embedThumbnail = document.getElementById('embedThumbnail');
  const embedChapters = document.getElementById('embedChapters');
  const sponsorBlock = document.getElementById('sponsorBlock');
  
  const cookiesBrowser = document.getElementById('cookiesBrowser');
  const authUser = document.getElementById('authUser');
  const authPass = document.getElementById('authPass');
  
  const rateLimit = document.getElementById('rateLimit');
  const proxy = document.getElementById('proxy');
  const geoBypass = document.getElementById('geoBypass');
  const restrictFilenames = document.getElementById('restrictFilenames');
  const outputTemplate = document.getElementById('outputTemplate');

  // Actions
  const commandOutput = document.getElementById('commandOutput');
  const copyBtn = document.getElementById('copyBtn');
  const grabTimeBtn = document.getElementById('grabTimeBtn');
  const toast = document.getElementById('toast');

  let currentTab = null;

  // 1. Get current URL
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      currentTab = tabs[0];
      if (currentTab.url && (currentTab.url.includes('youtube.com') || currentTab.url.includes('youtu.be'))) {
        urlInput.value = currentTab.url;
      } else {
        urlInput.value = "Please open a YouTube video.";
      }
    }
  } catch (err) {
    console.error("Error getting tab URL", err);
    urlInput.value = "Unable to get URL.";
  }

  // 2. Load settings
  const defaultSettings = {
    downloadMode: 'default',
    resolution: '1080',
    videoFormat: 'mp4',
    audioFormat: 'mp3',
    playlist: false,
    embedSubs: false,
    writeAutoSubs: false,
    embedMetadata: false,
    embedThumbnail: false,
    embedChapters: false,
    sponsorBlock: false,
    cookiesBrowser: '',
    rateLimit: '',
    proxy: '',
    geoBypass: false,
    restrictFilenames: false,
    outputTemplate: ''
  };

  try {
    const data = await chrome.storage.local.get(defaultSettings);
    downloadMode.value = data.downloadMode;
    resolutionSelect.value = data.resolution;
    videoFormatSelect.value = data.videoFormat;
    audioFormatSelect.value = data.audioFormat;
    playlistToggle.checked = data.playlist;
    
    embedSubs.checked = data.embedSubs;
    writeAutoSubs.checked = data.writeAutoSubs;
    embedMetadata.checked = data.embedMetadata;
    embedThumbnail.checked = data.embedThumbnail;
    embedChapters.checked = data.embedChapters;
    sponsorBlock.checked = data.sponsorBlock;
    
    cookiesBrowser.value = data.cookiesBrowser;
    rateLimit.value = data.rateLimit;
    proxy.value = data.proxy;
    geoBypass.checked = data.geoBypass;
    restrictFilenames.checked = data.restrictFilenames;
    outputTemplate.value = data.outputTemplate;
  } catch (err) {
    console.error("Failed to load settings:", err);
  }

  // 3. UI Update Logic
  function updateUI() {
    const mode = downloadMode.value;
    
    if (mode === 'default') {
      customVideoOptions.style.display = 'none';
      audioOptions.style.display = 'none';
    } else if (mode === 'custom') {
      customVideoOptions.style.display = 'flex';
      audioOptions.style.display = 'none';
    } else if (mode === 'audio') {
      customVideoOptions.style.display = 'none';
      audioOptions.style.display = 'block';
    }
  }

  // 4. Save settings
  async function saveSettings() {
    try {
      await chrome.storage.local.set({
        downloadMode: downloadMode.value,
        resolution: resolutionSelect.value,
        videoFormat: videoFormatSelect.value,
        audioFormat: audioFormatSelect.value,
        playlist: playlistToggle.checked,
        
        embedSubs: embedSubs.checked,
        writeAutoSubs: writeAutoSubs.checked,
        embedMetadata: embedMetadata.checked,
        embedThumbnail: embedThumbnail.checked,
        embedChapters: embedChapters.checked,
        sponsorBlock: sponsorBlock.checked,
        
        cookiesBrowser: cookiesBrowser.value,
        rateLimit: rateLimit.value,
        proxy: proxy.value,
        geoBypass: geoBypass.checked,
        restrictFilenames: restrictFilenames.checked,
        outputTemplate: outputTemplate.value
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  }

  // 5. Generate Command Logic
  function generateCommand() {
    if (!urlInput.value || urlInput.value.startsWith("Please") || urlInput.value.startsWith("Unable")) {
      commandOutput.value = "yt-dlp [options] <URL>";
      return;
    }

    let cmd = ['yt-dlp'];

    // Network & Output
    if (rateLimit.value.trim()) cmd.push(`--limit-rate ${rateLimit.value.trim()}`);
    if (proxy.value.trim()) cmd.push(`--proxy "${proxy.value.trim()}"`);
    if (geoBypass.checked) cmd.push('--geo-bypass');
    if (restrictFilenames.checked) cmd.push('--restrict-filenames');
    if (outputTemplate.value.trim()) cmd.push(`-o "${outputTemplate.value.trim()}"`);

    // Authentication
    if (cookiesBrowser.value) cmd.push(`--cookies-from-browser ${cookiesBrowser.value}`);
    if (authUser.value.trim()) cmd.push(`-u "${authUser.value.trim()}"`);
    if (authPass.value.trim()) cmd.push(`-p "${authPass.value.trim()}"`);

    // Playlist option (Default to --no-playlist if unchecked to prevent huge accidental downloads,
    // although yt-dlp might prompt or do single video by default on some URLs. Better explicit.)
    if (playlistToggle.checked) {
      cmd.push('--yes-playlist');
    } else {
      cmd.push('--no-playlist');
    }

    // Download Mode: Audio vs Custom vs Default
    const mode = downloadMode.value;
    if (mode === 'audio') {
      cmd.push('-x');
      cmd.push(`--audio-format ${audioFormatSelect.value}`);
    } else if (mode === 'custom') {
      const res = resolutionSelect.value;
      const vFormat = videoFormatSelect.value;
      cmd.push(`-f "bv*[height<=${res}]+ba/b"`);
      cmd.push(`--merge-output-format ${vFormat}`);
    }
    // If 'default', we pass no format flags, letting yt-dlp do its default (best video+audio)

    // Subtitles & Metadata
    if (embedSubs.checked || writeAutoSubs.checked) cmd.push('--write-subs');
    if (writeAutoSubs.checked) cmd.push('--write-auto-subs');
    if (embedSubs.checked) cmd.push('--embed-subs');
    
    if (embedMetadata.checked) cmd.push('--embed-metadata');
    if (embedThumbnail.checked) cmd.push('--embed-thumbnail');
    if (embedChapters.checked) cmd.push('--embed-chapters');
    if (sponsorBlock.checked) cmd.push('--sponsorblock-remove all');

    // Timestamps
    const start = startTimeInput.value.trim();
    const end = endTimeInput.value.trim();
    if (start || end) {
      const startVal = start || "0";
      const endVal = end || "inf";
      cmd.push(`--download-sections "*${startVal}-${endVal}"`);
    }

    // URL
    cmd.push(`"${urlInput.value}"`);
    
    commandOutput.value = cmd.join(' ');
  }

  // 6. Event Listeners
  const inputs = [
    downloadMode, resolutionSelect, videoFormatSelect, audioFormatSelect, playlistToggle,
    startTimeInput, endTimeInput, embedSubs, writeAutoSubs, embedMetadata, embedThumbnail, 
    embedChapters, sponsorBlock, cookiesBrowser, authUser, authPass, rateLimit, proxy, 
    geoBypass, restrictFilenames, outputTemplate
  ];

  inputs.forEach(input => {
    input.addEventListener('change', () => {
      updateUI();
      saveSettings();
      generateCommand();
    });
    if (input.type === 'text' || input.type === 'password') {
      input.addEventListener('input', generateCommand);
    }
  });

  // 7. Timestamp grabber
  grabTimeBtn.addEventListener('click', async () => {
    if (!currentTab || !currentTab.id || (!currentTab.url.includes('youtube.com') && !currentTab.url.includes('youtu.be'))) return;

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => {
          const video = document.querySelector('video');
          return video ? video.currentTime : null;
        }
      });

      if (results && results[0] && results[0].result !== null) {
        const timeInSeconds = results[0].result;
        const h = Math.floor(timeInSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((timeInSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(timeInSeconds % 60).toString().padStart(2, '0');
        
        if (h === "00") {
          startTimeInput.value = `${m}:${s}`;
        } else {
          startTimeInput.value = `${h}:${m}:${s}`;
        }
        generateCommand();
      }
    } catch (err) {
      console.error("Failed to grab timestamp:", err);
    }
  });

  // 8. Copy to Clipboard
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(commandOutput.value);
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  });

  // Init
  updateUI();
  generateCommand();
});
