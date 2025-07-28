-- Add columns for storing background-removed image URLs
-- This will help with debugging and provide better traceability
-- Original images stay in front_image_url, left_image_url, etc.
-- Background-removed versions go in front_nobgr_image_url, left_nobgr_image_url, etc.

ALTER TABLE photos 
ADD COLUMN front_nobgr_image_url TEXT,
ADD COLUMN left_nobgr_image_url TEXT,
ADD COLUMN right_nobgr_image_url TEXT,
ADD COLUMN back_nobgr_image_url TEXT;

-- Add comments to clarify the purpose of each image URL field
COMMENT ON COLUMN photos.front_image_url IS 'URL of the original front-facing image uploaded by user';
COMMENT ON COLUMN photos.left_image_url IS 'URL of the original left-facing image uploaded by user';
COMMENT ON COLUMN photos.right_image_url IS 'URL of the original right-facing image uploaded by user';
COMMENT ON COLUMN photos.back_image_url IS 'URL of the original back-facing image uploaded by user';
COMMENT ON COLUMN photos.front_nobgr_image_url IS 'URL of the front image after background removal processing';
COMMENT ON COLUMN photos.left_nobgr_image_url IS 'URL of the left image after background removal processing';
COMMENT ON COLUMN photos.right_nobgr_image_url IS 'URL of the right image after background removal processing';
COMMENT ON COLUMN photos.back_nobgr_image_url IS 'URL of the back image after background removal processing';
