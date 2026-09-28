const { Router } = require('express');
const uploadService = require('../services/uploadService');

module.exports = () => {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const upload = req.app.get('upload');
      upload.single('file')(req, res, async (err) => {
        if (err) return next(err);
        try {
          const media = await uploadService.uploadBuffer(req.file);
          return res.status(201).json({ media });
        } catch (e) {
          return next(e);
        }
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
