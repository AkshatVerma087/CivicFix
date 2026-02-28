const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
        cb(null, uniqueName);
    },
});

function fileFilter(req, file, cb) {
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const isVideo = file.mimetype && file.mimetype.startsWith('video/');

    if (isImage || isVideo) {
        return cb(null, true);
    }

    return cb(new Error('Only image and video files are allowed'));
}

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
});

module.exports = { upload };
