import multer from "multer";
import path from "path";
import fs from "fs";

const dest = path.resolve("uploads", "products");
fs.mkdirSync(dest, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dest),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "_").slice(0, 40);
    cb(null, `${Date.now()}_${base}${ext.toLowerCase()}`);
  },
});

const upload = multer({ storage });
export default upload;
