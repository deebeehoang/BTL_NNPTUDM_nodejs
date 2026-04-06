const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Tạo multer storage config
 * @param {string} folder - Tên thư mục con trong uploads (vd: 'destination', 'avatar')
 * @param {string} prefix - Tiền tố tên file (vd: 'destination', 'avatar')
 * @returns {multer.StorageEngine}
 */
function createStorage(folder, prefix) {
  return multer.diskStorage({
    destination: function (req, file, cb) {
      const dir = path.join(__dirname, `../../public/images/uploads/${folder}`);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  });
}

/**
 * File filter: chỉ chấp nhận hình ảnh
 */
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file hình ảnh!'), false);
  }
};

/**
 * File filter: chấp nhận PDF và hình ảnh
 */
const documentAndImageFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file PDF hoặc hình ảnh (JPG, PNG, GIF, WEBP)!'), false);
  }
};

// Upload cho ảnh điểm đến
const destinationUpload = multer({
  storage: createStorage('destination', 'destination'),
  fileFilter: imageFilter
});

// Upload cho ảnh đại diện
const avatarUpload = multer({
  storage: createStorage('avatar', 'avatar'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Upload cho chứng chỉ (PDF + ảnh)
const certificateUpload = multer({
  storage: createStorage('certificates', 'certificate'),
  fileFilter: documentAndImageFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Upload cho ảnh đánh giá
const ratingUpload = multer({
  storage: createStorage('ratings', 'rating'),
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = {
  createStorage,
  imageFilter,
  documentAndImageFilter,
  destinationUpload,
  avatarUpload,
  certificateUpload,
  ratingUpload
};
