// imageCompression.js
// Utility for compressing an image file in the browser *without* changing its pixel dimensions.

/**
 * Compress an image so its file size is below `maxMB` MiB while keeping the original width & height.
 * 
 * The algorithm progressively lowers JPEG quality (or uses WebP fallback for PNG/GIF) until the
 * desired size is reached, or it hits a minimum quality threshold.
 * 
 * @param {File}  file        – The source image File/Blob selected by the user.
 * @param {number} maxMB      – Maximum size in mebibytes (MiB) for the compressed file.
 * @param {Object} [opts]     – Optional settings.
 * @param {number} [opts.minQuality=0.3] – Lowest allowed quality before giving up.
 * @param {number} [opts.step=0.05]      – Step by which to decrease quality each iteration.
 * @returns {Promise<File>}             – A new File under the size limit, or the original file if
 *                                        already below the limit (or if we can’t compress enough).
 */
async function compressImage(file, maxMB, opts = {}) {
  const {
    minQuality = 0.3,
    step = 0.05
  } = opts;
  if (!(file instanceof File)) {
    throw new TypeError("compressImage expects a File instance");
  }
  if (!file.type.startsWith('image/')) throw new Error('Only image files are supported');
  if (file.size / 1048576 <= maxMB) return file; // already small enough

  const dataUrl = await _fileToDataURL(file);
  const img = await _dataURLToImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  let quality = 0.95; // start near‑visually‑lossless
  let blob = await _canvasToBlob(canvas, file.type, quality);

  // If the original was PNG/GIF, switch to WebP/JPEG for better compression
  const lossyType = /png|gif/i.test(file.type) ? "image/webp" : "image/jpeg";
  while (blob.size / 1048576 > maxMB && quality > minQuality) {
    quality = Math.max(quality - step, minQuality);
    blob = await _canvasToBlob(canvas, lossyType, quality);
  }

  // If we still couldn’t hit the target, return the smaller of the two (blob vs original)
  const finalBlob = blob.size < file.size ? blob : file;
  return new File([finalBlob], _renameWithExtension(file.name, finalBlob.type), {
    type: finalBlob.type,
    lastModified: Date.now()
  });
}

// ---------- Helpers ----------
function _fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = e => reject(e);
    reader.readAsDataURL(file);
  });
}
function _dataURLToImage(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataURL;
  });
}
function _canvasToBlob(canvas, type, quality) {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}
function _renameWithExtension(originalName, mimeType) {
  const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
  return originalName.replace(/\.[^.]+$/, "." + ext);
}

/**
 * Utility to get image dimensions from a File or Blob.
 * @param {File|Blob} file 
 * @returns {Promise<{width: number, height: number}>}
 */
function getImageDimensions(file) {
  if (!file.type.startsWith('image/')) throw new Error('Only image files are supported');
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Utility to check image has min width.
 * @param {File|Blob} file 
 * @param {number} minW - min width to be checked
 * @param {number} minH - min height to be checked
 * @returns {Promise<boolean>} true if has minimum dimensions
 */
async function hasMinDimension(file, minW, minH) {
  if (!file.type.startsWith('image/')) throw new Error('Only image files are supported');
  const {
    width,
    height
  } = await getImageDimensions(file);
  if (width < minW || height < minH) return false;
  return true;
}

// Helper to wrap canvas.toBlob in a Promise
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);else reject('Canvas toBlob failed');
    }, type, quality);
  });
}

/**
 * Automatically crops the given File to target dimensions and returns a File.
 * Preserves the original filename.
 * Keeps image type (PNG, JPEG, etc.) for output.
 * @param {File} file - File object from the file input
 * @param {number} targetW - Target crop width
 * @param {number} targetH - Target crop heighth
 * @param {number} maxMB - Maxximum mb limit to reduce the size (default: undefined)
 * @returns {Promise<File>} Cropped File object
 */

async function cropImage({
  file,
  targetW,
  targetH,
  maxMB
}) {
  if (!file.type.startsWith('image/')) throw new Error('Only image files are supported');
  if (!targetH && !targetW) return file;
  const {
    width,
    height
  } = await getImageDimensions(file);
  if (width <= targetW || height <= targetH) {
    if (file.size / 1024 / 1024 < maxMB) return file;
    return await compressImage(file, maxMB);
  }
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    const objectUrl = URL.createObjectURL(file);
    i.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(i);
    };
    i.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject('Image load error');
    };
    i.src = objectUrl;
  });
  const origW = img.naturalWidth;
  const origH = img.naturalHeight;
  const scaleX = targetW ? targetW / origW : 0;
  const scaleY = targetH ? targetH / origH : 0;
  const scale = Math.max(scaleX, scaleY);
  const newW = Math.ceil(origW * scale);
  const newH = Math.ceil(origH * scale);
  if (!targetW || targetW === 0) {
    targetW = scale * origW;
  }
  if (!targetH || targetH === 0) {
    targetH = scale * origH;
  }
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = newW;
  tempCanvas.height = newH;
  tempCanvas.getContext('2d').drawImage(img, 0, 0, newW, newH);
  const cropX = Math.floor((newW - targetW) / 2);
  const cropY = Math.floor((newH - targetH) / 2);
  const outCanvas = document.createElement('canvas');
  outCanvas.width = targetW;
  outCanvas.height = targetH;
  outCanvas.getContext('2d').drawImage(tempCanvas, cropX, cropY, targetW, targetH, 0, 0, targetW, targetH);
  let mimeType = file.type;
  if (!mimeType || mimeType === 'image/svg+xml') mimeType = 'image/png';
  const quality = mimeType === 'image/jpeg' ? 0.9 : undefined;
  const blob = await canvasToBlob(outCanvas, mimeType, quality);
  const originalName = file.name.replace(/\.[^/.]+$/, '');
  const extension = mimeType.split('/')[1] || 'png';
  const ext = extension === 'jpeg' ? 'jpg' : extension;
  const croppedFile = new File([blob], `${originalName}.${ext}`, {
    type: mimeType
  });
  if (maxMB) {
    return await compressImage(croppedFile, maxMB);
  }
  return croppedFile;
}

export { compressImage, cropImage, getImageDimensions, hasMinDimension };
//# sourceMappingURL=index.js.map
