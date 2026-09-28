const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const groupService = require('../services/groupService');
const parlorService = require('../services/parlorService');

const parseGroupId = (value) => {
  const groupId = Number.parseInt(value, 10);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    const err = new Error('Invalid group');
    err.status = 400;
    throw err;
  }
  return groupId;
};

const readRange = (query) => {
  const from = typeof query?.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : null;
  const to = typeof query?.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : from;
  if (!from) return null;
  return from <= to ? { from, to } : { from: to, to: from };
};

const parseOffset = (value) => {
  if (value == null || value === '') return 0;
  const text = String(value);
  if (!/^\d+$/.test(text)) {
    const err = new Error('Invalid day');
    err.status = 400;
    throw err;
  }
  const offset = Number(text);
  if (offset > 366) {
    const err = new Error('Invalid day');
    err.status = 400;
    throw err;
  }
  return offset;
};

module.exports = () => {
  const router = Router();

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.listMine(req.user.user_id, readRange(req.query));
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/conversations', requireAuth, async (req, res, next) => {
    try {
      const payload = await parlorService.listConversations(req.user.user_id);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/archived', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.listArchived(req.user.user_id);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.charter(req.user, req.body || {});
      return res.status(201).json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/join/:token', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.joinByToken(req.user, req.params.token);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/:groupId/days', requireAuth, async (req, res, next) => {
    try {
      const game = typeof req.query?.game === 'string' ? req.query.game : '';
      const payload = await groupService.getDay(
        req.user.user_id,
        parseGroupId(req.params.groupId),
        game,
        parseOffset(req.query?.offset)
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/:groupId/parlor/messages', requireAuth, async (req, res, next) => {
    try {
      const before = req.query?.before == null || req.query.before === ''
        ? null
        : Number(req.query.before);
      if (before != null && (!Number.isInteger(before) || before <= 0)) {
        return res.status(400).json({ error: 'Invalid page' });
      }
      const limit = req.query?.limit == null || req.query.limit === '' ? undefined : Number(req.query.limit);
      if (limit != null && (!Number.isInteger(limit) || limit < 1 || limit > 50)) {
        return res.status(400).json({ error: 'Invalid page' });
      }
      const payload = await parlorService.listMessages(
        req.user.user_id,
        parseGroupId(req.params.groupId),
        typeof req.query?.game === 'string' ? req.query.game : '',
        before,
        limit
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/:groupId/alerts', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.updateAlerts(
        req.user,
        parseGroupId(req.params.groupId),
        req.body || {}
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:groupId/parlor/messages/:messageId/reactions', requireAuth, async (req, res, next) => {
    try {
      const messageId = Number.parseInt(req.params.messageId, 10);
      if (!Number.isInteger(messageId) || messageId <= 0) {
        return res.status(400).json({ error: 'Invalid message' });
      }
      const payload = await parlorService.setReaction(
        req.user,
        parseGroupId(req.params.groupId),
        messageId,
        req.body?.kind
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:groupId/parlor/read', requireAuth, async (req, res, next) => {
    try {
      const payload = await parlorService.markRead(
        req.user.user_id,
        parseGroupId(req.params.groupId),
        typeof req.body?.game === 'string' ? req.body.game : ''
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:groupId/parlor/messages', requireAuth, async (req, res, next) => {
    try {
      const payload = await parlorService.postMessage(
        req.user,
        parseGroupId(req.params.groupId),
        req.body?.body,
        typeof req.body?.game === 'string' ? req.body.game : ''
      );
      return res.status(201).json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/:groupId', requireAuth, async (req, res, next) => {
    try {
      const game = typeof req.query?.game === 'string' ? req.query.game : undefined;
      const payload = await groupService.getGroup(
        req.user.user_id,
        parseGroupId(req.params.groupId),
        game,
        readRange(req.query)
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/:groupId/games', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.updateGames(
        req.user,
        parseGroupId(req.params.groupId),
        req.body || {}
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/:groupId', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.rename(
        req.user,
        parseGroupId(req.params.groupId),
        req.body?.name
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:groupId/archive', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.archive(req.user, parseGroupId(req.params.groupId));
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:groupId/unarchive', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.unarchive(req.user, parseGroupId(req.params.groupId));
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:groupId/leave', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.leave(req.user, parseGroupId(req.params.groupId));
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:groupId/members', requireAuth, async (req, res, next) => {
    try {
      const payload = await groupService.addMember(
        req.user,
        parseGroupId(req.params.groupId),
        req.body?.handle
      );
      return res.status(201).json(payload);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
