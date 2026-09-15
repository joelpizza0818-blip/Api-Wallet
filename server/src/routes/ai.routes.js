const express = require('express');
const { chat, generateReply } = require('../controllers/ai.controller');
const prisma = require('../config/database');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(requireAuth);

router.get('/chats', async (req, res, next) => {
  try {
    const chats = await prisma.aiChat.findMany({
      where: { userId: req.user.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(chats);
  } catch (e) {
    next(e);
  }
});

router.post('/chats', async (req, res, next) => {
  try {
    const title = typeof req.body.title === 'string' && req.body.title.trim() ? req.body.title.trim() : 'Nuevo chat';
    const newChat = await prisma.aiChat.create({
      data: { userId: req.user.id, title },
      include: { messages: true },
    });
    res.status(201).json(newChat);
  } catch (e) {
    next(e);
  }
});

router.patch('/chats/:id', async (req, res, next) => {
  try {
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    if (!title) return res.status(400).json({ message: 'El título no puede estar vacío.' });

    const chatRecord = await prisma.aiChat.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!chatRecord) return res.status(404).json({ message: 'Chat no encontrado.' });

    const updated = await prisma.aiChat.update({
      where: { id: chatRecord.id },
      data: { title, updatedAt: new Date() },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.delete('/chats/:id', async (req, res, next) => {
  try {
    const chatRecord = await prisma.aiChat.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!chatRecord) return res.status(404).json({ message: 'Chat no encontrado.' });

    await prisma.aiChat.delete({
      where: { id: chatRecord.id },
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

router.post('/chats/:id/messages', async (req, res, next) => {
  try {
    const chatRecord = await prisma.aiChat.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!chatRecord) return res.status(404).json({ message: 'Chat no encontrado' });

    const content = String(req.body.content || '').trim();
    const imageData = typeof req.body.imageData === 'string' && req.body.imageData.startsWith('data:image/') ? req.body.imageData : null;
    if (!content && !imageData) return res.status(400).json({ message: 'El mensaje no puede estar vacío.' });

    // The database is the source of truth for context
    const persisted = await prisma.aiMessage.findMany({
      where: { chatId: chatRecord.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const context = [...persisted.reverse(), { role: 'user', content, imageData }];
    const reply = await generateReply(context);

    const isFirstTurn = chatRecord.title === 'Nuevo chat' || persisted.length === 0;
    const newTitle = isFirstTurn ? content.slice(0, 32).trim() || 'Chat' : undefined;

    const [userMessage, assistantMessage] = await prisma.$transaction([
      prisma.aiMessage.create({
        data: { chatId: chatRecord.id, role: 'user', content },
      }),
      prisma.aiMessage.create({
        data: { chatId: chatRecord.id, role: 'assistant', content: reply },
      }),
      prisma.aiChat.update({
        where: { id: chatRecord.id },
        data: {
          updatedAt: new Date(),
          ...(newTitle ? { title: newTitle } : {}),
        },
      }),
    ]);

    res.json({ reply, messages: [userMessage, assistantMessage] });
  } catch (e) {
    next(e);
  }
});

router.post('/chat', chat);

module.exports = router;
