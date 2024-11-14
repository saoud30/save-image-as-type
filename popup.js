document.addEventListener('DOMContentLoaded', () => {
  // Display version
  const version = chrome.runtime.getManifest().version;
  document.querySelector('.version').textContent = `Version ${version}`;

  // Load saved settings
  chrome.storage.sync.get({
    quality: 92,
    stripMetadata: false,
    optimizeImage: true,
    defaultFormat: 'webp',
    maintainAspectRatio: true
  }, (settings) => {
    document.getElementById('quality').value = settings.quality;
    document.getElementById('qualityValue').textContent = `${settings.quality}%`;
    document.getElementById('stripMetadata').checked = settings.stripMetadata;
    document.getElementById('optimizeImage').checked = settings.optimizeImage;
    document.getElementById('defaultFormat').value = settings.defaultFormat;
    document.getElementById('maintainAspectRatio').checked = settings.maintainAspectRatio;
  });

  // Quality slider
  const qualitySlider = document.getElementById('quality');
  qualitySlider.addEventListener('input', (e) => {
    const value = e.target.value;
    document.getElementById('qualityValue').textContent = `${value}%`;
    saveSettings();
  });

  // Maintain aspect ratio
  const widthInput = document.getElementById('width');
  const heightInput = document.getElementById('height');
  let aspectRatio = 1;

  widthInput.addEventListener('input', () => {
    if (document.getElementById('maintainAspectRatio').checked && aspectRatio) {
      heightInput.value = Math.round(widthInput.value / aspectRatio);
    }
    saveSettings();
  });

  heightInput.addEventListener('input', () => {
    if (document.getElementById('maintainAspectRatio').checked && aspectRatio) {
      widthInput.value = Math.round(heightInput.value * aspectRatio);
    }
    saveSettings();
  });

  // Save settings when changed
  document.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('change', saveSettings);
  });
});

function saveSettings() {
  const settings = {
    quality: parseInt(document.getElementById('quality').value),
    stripMetadata: document.getElementById('stripMetadata').checked,
    optimizeImage: document.getElementById('optimizeImage').checked,
    defaultFormat: document.getElementById('defaultFormat').value,
    maintainAspectRatio: document.getElementById('maintainAspectRatio').checked,
    width: document.getElementById('width').value,
    height: document.getElementById('height').value
  };

  chrome.storage.sync.set(settings);
}