const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const config = require('../config/env');

for (const dir of [config.uploadDir, config.finalWorkDir]) fs.mkdirSync(dir, { recursive: true });

const allowed = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.zip']);

function makeUpload(dir) {
  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => cb(null, `${Date.now()}-${uuid()}${path.extname(file.originalname).toLowerCase()}`)
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowed.has(ext)) return cb(new Error('Only PDF, JPG, PNG, and ZIP files are allowed'));
      cb(null, true);
    }
  });
}

module.exports = { uploadDocs: makeUpload(config.uploadDir), uploadFinal: makeUpload(config.finalWorkDir) };
