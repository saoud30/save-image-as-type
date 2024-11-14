// Initialize messages object
let messages = {};

// Helper function for notifications
function notify(msg) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'Save Image As Type',
    message: typeof msg === 'string' ? msg : msg.message || 'Error processing image'
  });
}

// Get suggested filename based on URL and type
function getSuggestedFilename(src, type) {
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    return `image.${type}`;
  }
  
  let filename = src.split('?')[0].split('/').pop().replace(/\+/g, ' ');
  try {
    filename = decodeURIComponent(filename);
  } catch (e) {
    filename = 'image';
  }
  
  // Always use 'jpg' extension for JPEG files
  if (type === 'jpeg') {
    type = 'jpg';
  }
  
  filename = filename.replace(/\.(jpe?g|png|webp)$/i, '')
                    .substring(0, 32)
                    .trim() || 'image';
  
  return `${filename}.${type}`;
}

// Download function
function download(url, filename) {
  chrome.downloads.download(
    { url, filename, saveAs: true },
    (downloadId) => {
      if (!downloadId && chrome.runtime.lastError) {
        notify(`Error saving image: ${chrome.runtime.lastError.message}`);
      }
    }
  );
}

// Check if offscreen document exists
async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL('offscreen.html');
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  return existingContexts.some(context => context.documentUrl === offscreenUrl);
}

// Create offscreen document
async function createOffscreenDocument() {
  try {
    if (!(await hasOffscreenDocument())) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_PARSER'],
        justification: 'Image format conversion requires DOM manipulation'
      });
    }
  } catch (error) {
    throw new Error(`Failed to create offscreen document: ${error.message}`);
  }
}

// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  const formats = ['jpg', 'png', 'webp'];
  formats.forEach(type => {
    chrome.contextMenus.create({
      id: `save-as-${type}`,
      title: `Save as ${type.toUpperCase()}`,
      contexts: ['image']
    });
  });
});

// Handle messages from offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'download') {
    download(message.url, message.filename);
  } else if (message.type === 'error') {
    notify(message.error);
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.srcUrl) {
    notify('No image source URL found');
    return;
  }

  const type = info.menuItemId.replace('save-as-', '');
  const filename = getSuggestedFilename(info.srcUrl, type);

  try {
    await createOffscreenDocument();

    // Get current settings
    const settings = await chrome.storage.sync.get({
      quality: 92,
      stripMetadata: false,
      optimizeImage: true,
      width: null,
      height: null
    });

    // Send message to offscreen document to process image
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'convert',
      src: info.srcUrl,
      format: type === 'jpg' ? 'jpeg' : type,
      filename: filename,
      settings: settings
    });
  } catch (error) {
    notify(`Failed to process image: ${error.message}`);
    // Fallback: try direct download
    download(info.srcUrl, filename);
  }
});