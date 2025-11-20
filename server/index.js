import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || '.docx';
    cb(null, `${crypto.randomUUID()}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      cb(new Error('Only DOC or DOCX files are allowed.'));
    } else {
      cb(null, true);
    }
  },
});

const app = express();
const PORT = process.env.UPLOAD_PORT || 5174;
const PUBLIC_BASE_URL = 'http://host.docker.internal:5174';

const buildPublicUrl = (req, fileName) => {
  const base =
    PUBLIC_BASE_URL ||
    `${req.protocol}://${req.get('host') ?? `localhost:${PORT}`}`;
  return `${base.replace(/\/$/, '')}/uploads/${fileName}`;
};

app.use(
  cors({
    origin: '*',
  }),
);
app.use(express.json());
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  }),
);

app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uploadDirExists: fs.existsSync(UPLOAD_DIR),
      publicBaseUrl: PUBLIC_BASE_URL || null,
    });
  });
  

app.post('/api/uploads', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File is required.' });
  }

  const uploadId = req.file.filename;
  const documentKey = crypto.randomUUID();
  const payload = {
    uploadId,
    documentKey,
    originalName: req.file.originalname,
    url: buildPublicUrl(req, uploadId),
    size: req.file.size,
    mimeType: req.file.mimetype,
  };

  return res.status(201).json(payload);
});

app.delete('/api/uploads/:uploadId', async (req, res) => {
  const uploadId = path.basename(req.params.uploadId);
  const targetPath = path.join(UPLOAD_DIR, uploadId);

  try {
    await fs.promises.unlink(targetPath);
    return res.status(204).end();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'Upload not found.' });
    }
    console.error('Failed to delete upload', error);
    return res.status(500).json({ message: 'Unable to delete upload.' });
  }
});

// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  console.error('Upload error:', error);
  const status = error.message?.includes('DOC')
    ? 400
    : error.status || 500;
  res.status(status).json({ message: error.message || 'Upload failed.' });
});

app.listen(PORT, () => {
  console.log(`Upload server ready on http://localhost:${PORT}`);
  if (PUBLIC_BASE_URL) {
    console.log(`Public base URL for ONLYOFFICE: ${PUBLIC_BASE_URL}`);
  } else {
    console.log(
      'Tip: set PUBLIC_BASE_URL (e.g. http://host.docker.internal:5174) so the Document Server inside Docker can reach the uploads.',
    );
  }
});

