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
export async function compressImage(file, maxMB, opts = {}) {
    const { minQuality = 0.3, step = 0.05 } = opts;

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
    const lossyType = (/png|gif/i.test(file.type)) ? "image/webp" : "image/jpeg";

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
    reader.onerror = (e) => reject(e);
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
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function _renameWithExtension(originalName, mimeType) {
  const ext = mimeType.split("/")[1].replace("jpeg", "jpg");
  return originalName.replace(/\.[^.]+$/, "." + ext);
}
