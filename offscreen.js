// Create a canvas element for image processing
function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// Convert image data to specific format
async function convertImage(imageData, type, settings) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = async () => {
      try {
        let canvas = createCanvas(
          settings.width || img.naturalWidth,
          settings.height || img.naturalHeight
        );
        
        const ctx = canvas.getContext('2d');
        
        // Use white background for JPG conversion to handle transparency
        if (type === 'jpg' || type === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const mimeType = type === 'jpg' ? 'image/jpeg' : `image/${type}`;
        const quality = type === 'png' ? 1.0 : settings.quality / 100;
        
        // Apply optimization if enabled
        if (settings.optimizeImage) {
          // Basic image optimization
          canvas = optimizeImage(canvas, type);
        }
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to convert image'));
            return;
          }
          
          // Strip metadata if requested
          if (settings.stripMetadata) {
            resolve(new Blob([blob], { type: blob.type }));
          } else {
            resolve(blob);
          }
        }, mimeType, quality);
      } catch (error) {
        reject(new Error(`Failed to process image: ${error.message}`));
      }
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    
    if (imageData instanceof Blob) {
      img.src = URL.createObjectURL(imageData);
    } else {
      img.src = imageData;
    }
  });
}

// Basic image optimization
function optimizeImage(canvas, type) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Basic color optimization
  for (let i = 0; i < data.length; i += 4) {
    if (type === 'png') {
      // PNG optimization: reduce color depth
      data[i] = Math.round(data[i] / 32) * 32;     // R
      data[i + 1] = Math.round(data[i + 1] / 32) * 32; // G
      data[i + 2] = Math.round(data[i + 2] / 32) * 32; // B
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Process image
async function processImage(src, type, settings) {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const blob = await response.blob();
    if (!blob.size) throw new Error('Downloaded file is empty');
    
    const convertedBlob = await convertImage(blob, type, settings);
    return URL.createObjectURL(convertedBlob);
  } catch (error) {
    throw new Error(`Failed to process image: ${error.message}`);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  if (message.type === 'convert') {
    try {
      const objectUrl = await processImage(message.src, message.format, message.settings);
      
      chrome.runtime.sendMessage({
        type: 'download',
        url: objectUrl,
        filename: message.filename
      });

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'error',
        error: error.message
      });
    }
  }
});