const express = require('express');
const { chat, generateReply } = require('../controllers/ai.controller');
const prisma = require('../config/database');
const { requireAuth } = require('../middleware/auth.middleware');
const router = express.Router();
router.use(requireAuth);
router.get('/chats', async (req, res, next) => { try { res.json(await prisma.aiChat.findMany({ where: { userId: req.user.id }, include: { messages: { orderBy: { createdAt: 'asc' } } }, orderBy: { updatedAt: 'desc' } })); } catch (e) { next(e); } });
router.post('/chats', async (req, res, next) => { try { res.status(201).json(await prisma.aiChat.create({ data: { userId: req.user.id } })); } catch (e) { next(e); } });
router.delete('/chats/:id', async (req, res, next) => { try { await prisma.aiChat.deleteMany({ where: { id: req.params.id, userId: req.user.id } }); res.status(204).end(); } catch (e) { next(e); } });
router.post('/chats/:id/messages', async (req, res, next) => {
  try {
    const chatRecord = await prisma.aiChat.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!chatRecord) return res.status(404).json({ message: 'Chat no encontrado' });

    const content = String(req.body.content || '').trim();
    if (!content) return res.status(400).json({ message: 'El mensaje no puede estar vacío.' });

    // The database, rather than the browser, is the source of truth for context.
    // Gemini receives the latest 20 turns plus the user's new message.
    const persisted = await prisma.aiMessage.findMany({
      where: { chatId: chatRecord.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const context = [...persisted.reverse(), { role: 'user', content }];
    const reply = await generateReply(context);

    const [userMessage, assistantMessage] = await prisma.$transaction([
      prisma.aiMessage.create({ data: { chatId: chatRecord.id, role: 'user', content } }),
      prisma.aiMessage.create({ data: { chatId: chatRecord.id, role: 'assistant', content: reply } }),
      prisma.aiChat.update({
        where: { id: chatRecord.id },
        data: {
          updatedAt: new Date(),
          ...(chatRecord.title === 'Nuevo chat' ? { title: content.slice(0, 28) } : {}),
        },
      }),
    ]);
    res.json({ reply, messages: [userMessage, assistantMessage] });
  } catch (e) { next(e); }
});
router.post('/chat', chat);
module.exports = router;
