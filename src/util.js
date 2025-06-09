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
