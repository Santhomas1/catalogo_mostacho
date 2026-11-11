// The thumbnail migration must be applied before publishing this version.
// Explicit false remains available for a safe rollback to original images.
export const PRODUCT_THUMBNAILS = import.meta.env.VITE_PRODUCT_THUMBNAILS !== 'false'
