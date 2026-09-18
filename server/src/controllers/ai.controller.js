const fetchFn = (...args) => fetch(...args);
const REVIEW_SYSTEM_PROMPT = `Eres el revisor técnico de importaciones de API de API Wallet, separado del chat general.
Tu trabajo es auditar endpoints detectados contra el código fuente proporcionado.
Analiza exclusivamente: montajes de routers y prefijos, rutas duplicadas o incompletas, método HTTP, URLs absolutas y relativas, parámetros de ruta, cuerpos de escritura y evidencia suficiente para cada hallazgo.
Trata cada ruta escrita explícitamente como válida aunque contenga /api/api o segmentos repetidos. Nunca corrijas una ruta por estilo, nunca inventes endpoints y nunca recomiendes borrar una ruta sin evidencia textual.
Responde exactamente en el formato JSON solicitado por el mensaje de revisión. Si no puedes demostrar un problema en el código, devuelve status pass.`;

async function generateWithSystemPrompt(messages, systemPrompt) {
  const key = process.env.API_KEY_GEMINI1 || process.env.API_KEY_GEMINI2;
  if (!key) { const error = new Error('No hay una API key de IA configurada.'); error.statusCode = 503; throw error; }
  const contents = messages.slice(-20).map((message) => {
    const parts = [{ text: String(message.content || '') }];
    const match = typeof message.imageData === 'string' && /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(message.imageData);
    if (match && message.role !== 'assistant') parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    return { role: message.role === 'assistant' ? 'model' : 'user', parts };
  });
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const response = await fetchFn(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents }), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error?.message || 'El proveedor de IA rechazó la solicitud.'); error.statusCode = response.status; throw error; }
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || 'No recibí contenido del modelo.';
}

async function generateReply(messages) {
  return generateWithSystemPrompt(messages, process.env.BOT_PROMPT || 'Responde en español de forma útil y segura.');
}

function generateReviewReply(messages) {
  return generateWithSystemPrompt(messages, REVIEW_SYSTEM_PROMPT);
}

async function chat(req, res, next) {
  try {
    const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-20) : [];
    res.json({ reply: await generateReply(messages) });
  } catch (error) { next(error); }
}

module.exports = { chat, generateReply, generateReviewReply, REVIEW_SYSTEM_PROMPT };
