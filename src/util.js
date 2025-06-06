import imageCompression from 'browser-image-compression';

/**
 * Compress an image File to a target max size in MB.
 * Logs original and compressed size + dimensions.
 * 
 * @param {File} file - The original image File
 * @param {number} maxSizeMB - Target max size in megabytes
 * @returns {Promise<File>} - Compressed File
 */
export async function compressImage(file, maxSizeMB) {
  if (!file.type.startsWith('image/')) throw new Error('Only image files are supported');

  // Load original dimensions
  const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
  const origDims = await getImageDimensions(file);
  console.log(` Original dimensions: ${origDims.width} × ${origDims.height}, ${originalSizeMB} MB`);

  // Skip if already under threshold
  if (file.size / 1024 / 1024 <= maxSizeMB) {
    return file;
  }

  const options = {
    maxSizeMB,
    useWebWorker: true,
  };

  try {
    const compressed = await imageCompression(file, options);
    
    const compressedSizeMB = (compressed.size / 1024 / 1024).toFixed(2);
    const compressedDims = await getImageDimensions(compressed);
    console.log(`Compressed dimensions: ${compressedDims.width} × ${compressedDims.height}, ${compressedSizeMB} MB`);

    return compressed;
  } catch (err) {
    throw err;
  }
}

/**
 * Utility to get image dimensions from a File or Blob.
 * @param {File|Blob} file 
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {  
  if (!file.type.startsWith('image/')) throw new Error('Only image files are supported');
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
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
export async function hasMinDimension(file, minW, minH) {
  if (!file.type.startsWith('image/')) throw new Error('Only image files are supported');
  const {width, height} = await getImageDimensions(file)
  
  if(width < minW || height < minH) return false
  return true
}
