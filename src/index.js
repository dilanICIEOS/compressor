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
export { cropImage } from './cropImage';



/**
 * Compress an image File to a target max size in MB.
 * @param {File} file - The original image File
 * @param {number} maxSizeMB - Target max size in megabytes
 * @returns {Promise<File>} - Compressed File
 */
export { compressImage } from './util'; 



/**
 * Utility to check image has minimum dimensions.
 * @param {File|Blob} file 
 * @param {number} minW - min width to be checked
 * @param {number} minH - min height to be checked
 * @returns {Promise<boolean>} true if has minimum dimensions
 */
export { hasMinDimension } from './util' 



/**
 * Utility to get image dimensions.
 * @param {File|Blob} file 
 * @returns {Promise<{width: number, height: number}>}
 */
export { getImageDimensions } from './util'