import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
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
  limits: { fileSize: 125 * 1024 * 1024 }, // 125 MB
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

// JWT Configuration
const JWT_SECRET = 'JWT-Secret-Key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const DOC_KEY_SECRET =
  process.env.DOC_KEY_SECRET || 'onlyoffice-doc-key-secret';

const documentMetadataStore = new Map();

const normalizeUrl = (url) =>
  url?.trim().replace(/\s+/g, '').replace(/\/+$/, '').toLowerCase() || '';

const generateDeterministicDocumentKey = (url) =>
  crypto
    .createHash('sha256')
    .update(`${DOC_KEY_SECRET}::${url}`)
    .digest('hex')
    .slice(0, 32);

const getOrCreateDocumentMetadata = (url, extra = {}) => {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl) return null;

  const existing = documentMetadataStore.get(normalizedUrl);
  const documentKey =
    existing?.documentKey || generateDeterministicDocumentKey(normalizedUrl);

  const metadata = {
    url,
    normalizedUrl,
    documentKey,
    originalName: extra.originalName || existing?.originalName || '',
    title: extra.title || existing?.title || extra.originalName || '',
    lastModifiedAt:
      extra.lastModifiedAt || existing?.lastModifiedAt || new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
    ...existing,
    ...extra,
  };
  console.log("Metadata --> ",metadata);
  documentMetadataStore.set(normalizedUrl, metadata);
  return metadata;
};

// Mock users database (in production, this would be a real database)
const MOCK_USERS = [
  {
    id: 1,
    username: 'admin',
    password: 'admin123', // In production, use hashed passwords
    name: 'Administrator',
    email: 'admin@example.com',
  },
  {
    id: 2,
    username: 'editor',
    password: 'editor123',
    name: 'Document Editor',
    email: 'editor@example.com',
  },
  {
    id: 3,
    username: 'viewer',
    password: 'viewer123',
    name: 'Document Viewer',
    email: 'viewer@example.com',
  },
];

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

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Authentication Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  // Find user in mock database
  const user = MOCK_USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' });
  }

  // Create JWT token
  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  // console.log("Login token --> ",token);
  // Return token and user info (without password)
  const { password: _, ...userWithoutPassword } = user;
  res.json({
    token,
    user: userWithoutPassword,
    expiresIn: JWT_EXPIRES_IN,
  });
});

// Verify token endpoint
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
  });
});

// Generate JWT token specifically for OnlyOffice Document Server
app.post('/api/onlyoffice/token', authenticateToken, (req, res) => {
  const { config } = req.body ?? {};

  if (!config || typeof config !== 'object') {
    return res
      .status(400)
      .json({ message: 'Editor configuration payload is required.' });
  }

  if (!config.document || !config.editorConfig) {
    return res.status(400).json({
      message:
        'Editor configuration must include both document and editorConfig sections.',
    });
  }

  const augmentedConfig = {
    ...config,
    editorConfig: {
      ...config.editorConfig,
      user: {
        id: String(req.user?.id ?? 'user'),
        name: req.user?.name ?? req.user?.username ?? 'Authenticated User',
        email: req.user?.email ?? 'user@example.com',
      },
    },
  };

  try {
    const token = jwt.sign(augmentedConfig, JWT_SECRET, {
      expiresIn: '5m',
    });
    // console.log(token);
    return res.json({
      token,
      issuedAt: new Date().toISOString(),
      expiresIn: '5m',
    });
  } 
  catch (error) {
    console.error('Failed to sign OnlyOffice config', error);
    return res
      .status(500)
      .json({ message: 'Unable to sign editor configuration.' });
  }
});

// Persist & retrieve document metadata keyed by URL
app.post('/api/documents/metadata', authenticateToken, (req, res) => {
  const { url, title, originalName } = req.body ?? {};
  if (!url) {
    return res.status(400).json({ message: 'Document URL is required.' });
  }

  const metadata = getOrCreateDocumentMetadata(url, {
    title,
    originalName,
    requestedBy: req.user?.username,
  });

  if (!metadata) {
    return res.status(500).json({ message: 'Unable to store document metadata.' });
  }

  return res.json({
    documentKey: metadata.documentKey,
    url: metadata.url,
    title: metadata.title,
    originalName: metadata.originalName,
    lastAccessedAt: metadata.lastAccessedAt,
  });
});

app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uploadDirExists: fs.existsSync(UPLOAD_DIR),
      publicBaseUrl: PUBLIC_BASE_URL || null,
    });
  });
  

app.post('/api/uploads', authenticateToken, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'File is required.' });
  }

  const uploadId = req.file.filename;
  const fileUrl = buildPublicUrl(req, uploadId);
  const metadata = getOrCreateDocumentMetadata(fileUrl, {
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    lastModifiedAt: new Date().toISOString(),
    uploadId,
  });

  const payload = {
    uploadId,
    documentKey: metadata.documentKey,
    originalName: req.file.originalname,
    url: fileUrl,
    size: req.file.size,
    mimeType: req.file.mimetype,
  };

  return res.status(201).json(payload);
});

app.delete('/api/uploads/:uploadId', authenticateToken, async (req, res) => {
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

