
import { Router } from 'express';
import multer from 'multer';

import { env } from '../config/env';
import { authenticate } from '../middleware/authenticate';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024, // 3 MB
  },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      callback(new Error('Only JPG, PNG, WEBP, and GIF images are allowed'));
      return;
    }

    callback(null, true);
  },
});

router.post(
  '/image',
  authenticate,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!env.IMGBB_API_KEY) {
        res.status(500).json({
          success: false,
          message: 'Image upload service is not configured',
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'Please select an image',
        });
        return;
      }

      const formData = new FormData();

      const imageBuffer = new ArrayBuffer(req.file.buffer.length);

new Uint8Array(imageBuffer).set(req.file.buffer);

formData.append(
  'image',
  new Blob([imageBuffer], { type: req.file.mimetype }),
  req.file.originalname
);

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${encodeURIComponent(env.IMGBB_API_KEY)}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success || !result.data?.url) {
        console.error('ImgBB upload failed:', result);

        res.status(502).json({
          success: false,
          message: 'Image upload failed. Please try again.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: result.data.url,
          displayUrl: result.data.display_url,
        },
      });
    } catch (error) {
      console.error('Image upload error:', error);

      res.status(500).json({
        success: false,
        message: 'Something went wrong while uploading the image',
      });
    }
  }
);

export default router;
