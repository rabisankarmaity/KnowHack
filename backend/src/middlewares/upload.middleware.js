const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-zip-compressed',
  'video/mp4', 'video/webm', 'video/quicktime',
]);
const BLOCKED_EXT = /\.(exe|bat|cmd|sh|js|jar|msi|dll|apk|com|scr|vbs|ps1|php|py|rb)$/i;

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (_req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    return {
      folder: process.env.CLOUDINARY_FOLDER || 'knowhack',
      resource_type: isImage ? 'image' : isVideo ? 'video' : 'raw',
      public_id: `${Date.now()}-${file.originalname.replace(/\.[^.]+$/, '')}`.replace(/\s+/g, '_'),
    };
  },
});

function fileFilter(_req, file, cb) {
  if (BLOCKED_EXT.test(file.originalname)) return cb(new ApiError(400, 'File type is not allowed'));
  if (!ALLOWED_MIME.has(file.mimetype)) return cb(new ApiError(400, `Unsupported MIME type: ${file.mimetype}`));
  cb(null, true);
}

const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25;
const upload = multer({ storage, fileFilter, limits: { fileSize: maxMb * 1024 * 1024 } });

module.exports = { upload };
