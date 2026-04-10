// File uploads for venue media. Disk storage only — files land under
// apps/server/uploads/{photos,menus} and are served by the static handler
// mounted at /uploads in index.ts.
//
// Returned URLs are app-relative ("/uploads/photos/abc.jpg") so the frontend
// can wrap them with apiUrl() to get an absolute URL.

import { Router, type Request, type Response, type NextFunction } from "express";
import multer, { type FileFilterCallback } from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { Role } from "@bisp-final-flow/db/generated/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

// Resolve directories relative to the server CWD so the path matches the
// express.static mount in index.ts.
const PHOTO_DIR = path.resolve("uploads/photos");
const MENU_DIR  = path.resolve("uploads/menus");

fs.mkdirSync(PHOTO_DIR, { recursive: true });
fs.mkdirSync(MENU_DIR,  { recursive: true });

const PHOTO_MIME = new Set(["image/jpeg", "image/png"]);
const MENU_MIME  = new Set(["application/pdf"]);

// Random filename + the original extension (lowercased) so the public URL
// stays neutral while still being a valid file.
function makeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  return `${crypto.randomUUID()}${ext}`;
}

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PHOTO_DIR),
  filename:    (_req, file, cb) => cb(null, makeFilename(file.originalname)),
});

const menuStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MENU_DIR),
  filename:    (_req, file, cb) => cb(null, makeFilename(file.originalname)),
});

const photoUpload = multer({
  storage: photoStorage,
  limits:  { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    if (PHOTO_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG or PNG images are allowed"));
  },
});

const menuUpload = multer({
  storage: menuStorage,
  limits:  { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb: FileFilterCallback) => {
    if (MENU_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only PDF files are allowed"));
  },
});

const router = Router();

// POST /api/uploads/photos — multi-image upload (max 10, JPG/PNG, ≤5MB each)
router.post(
  "/photos",
  requireAuth,
  requireRole(Role.PROVIDER),
  (req: Request, res: Response, next: NextFunction) => {
    photoUpload.array("files", 10)(req, res, (err: unknown) => {
      if (err) return next(err);
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      const urls = files.map(f => `/uploads/photos/${f.filename}`);
      res.json({ urls });
    });
  },
);

// POST /api/uploads/menu — single PDF upload (≤10MB)
router.post(
  "/menu",
  requireAuth,
  requireRole(Role.PROVIDER),
  (req: Request, res: Response, next: NextFunction) => {
    menuUpload.single("file")(req, res, (err: unknown) => {
      if (err) return next(err);
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }
      res.json({ url: `/uploads/menus/${file.filename}` });
    });
  },
);

// Convert multer/file-filter errors into 400s instead of 500s.
router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  if (err instanceof Error) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Upload failed" });
});

export default router;
