import { compressImage, getImageDimensions } from "./util";

// Helper to wrap canvas.toBlob in a Promise
function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject('Canvas toBlob failed');
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
 * @param {number} maxMbLimit - Maxximum mb limit to reduce the size (default: undefined)
 * @returns {Promise<File>} Cropped File object
 */

export async function cropImage({file, targetW, targetH, maxMbLimit}) {
  
  if (!file.type.startsWith('image/')) throw new Error('Only image files are supported');

  const {width, height} = await getImageDimensions(file)
  
  if(width <= targetW || height <= targetH){
    if((file.size / 1024 / 1024) < maxMbLimit) return file
    return await compressImage(file, maxMbLimit);
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

  const scale = Math.max(targetW / origW, targetH / origH);
  const newW = Math.ceil(origW * scale);
  const newH = Math.ceil(origH * scale);

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

  const croppedFile = new File([blob], `${originalName}.${ext}`, { type: mimeType });

  if (maxMbLimit) {
    return await compressImage(croppedFile, maxMbLimit);
  }

  return croppedFile;
}