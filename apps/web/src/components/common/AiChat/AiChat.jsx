import { useEffect, useMemo, useState } from 'react';
import './AiChat.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const initialChat = () => ({ id: crypto.randomUUID(), title: 'Nuevo chat', messages: [] });

function renderMessage(text) {
  const parts = text.split(/```([\s\S]*?)```/g);
  return parts.map((part, index) => index % 2 === 1
    ? <pre key={index} className="ai-code-block"><code>{part.replace(/^\w+\n/, '')}</code></pre>
    : <span key={index}>{part}</span>);
}

export default function AiChat({ isOpen, onClose }) {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const active = useMemo(() => chats.find((chat) => chat.id === activeId) || chats[0], [chats, activeId]);

  useEffect(() => { fetch(`${API_URL}/api/ai/chats`, { credentials: 'include' }).then((r) => r.ok ? r.json() : []).then((data) => { const hydrated = data.map((chat) => ({ ...chat, messages: Array.isArray(chat.messages) ? chat.messages : [] })); if (hydrated.length) { setChats(hydrated); setActiveId(hydrated[0].id); } else newChat(); }).catch(() => setChats([initialChat()])); }, []);
  useEffect(() => { if (!activeId && chats[0]) setActiveId(chats[0].id); }, [activeId, chats]);

  const updateChat = (messages) => setChats((prev) => prev.map((chat) => chat.id === active.id ? { ...chat, messages, title: (chat.messages || []).length ? chat.title : (messages[0]?.content || 'Nuevo chat').slice(0, 28) } : chat));
  const send = async () => {
    const text = draft.trim(); if (!text || loading) return;
    const history = [...active.messages, { role: 'user', content: text }];
    updateChat(history); setDraft(''); setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/ai/chats/${active.id}/messages`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo consultar el modelo');
      updateChat([...history, { role: 'assistant', content: data.reply }]);
    } catch (error) { updateChat([...history, { role: 'assistant', content: `Error: ${error.message}` }]); }
    finally { setLoading(false); }
  };
  const newChat = async () => { const response = await fetch(`${API_URL}/api/ai/chats`, { method: 'POST', credentials: 'include' }); const chat = response.ok ? await response.json() : initialChat(); setChats((prev) => [chat, ...prev]); setActiveId(chat.id); };
  const testExternalApi = async () => { setLoading(true); try { const r = await fetch('https://jsonplaceholder.typicode.com/todos/1'); const data = await r.json(); updateChat([...active.messages, { role: 'assistant', content: `Prueba API externa exitosa (JSONPlaceholder):\n\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`` }]); } catch (e) { updateChat([...active.messages, { role: 'assistant', content: `Error en API externa: ${e.message}` }]); } finally { setLoading(false); } };

  return <aside className={`ai-chat-drawer ${isOpen ? 'is-open' : ''}`} aria-label="Asistente IA" aria-hidden={!isOpen}>
    <header className="ai-chat-header"><div><strong>Asistente IA</strong><small>{active?.messages?.length || 0} mensajes · contexto 20</small></div><button onClick={onClose}>×</button></header>
    <div className="ai-chat-body"><div className="ai-chat-history">{chats.map((chat) => <button key={chat.id} className={chat.id === active?.id ? 'active' : ''} onClick={() => setActiveId(chat.id)}>{chat.title}</button>)}<button className="new-chat" onClick={newChat}>＋ Nuevo chat</button></div><div className="ai-chat-messages">{active?.messages?.length ? active.messages.map((message, i) => <div key={i} className={`ai-message ${message.role}`}><span className="ai-role">{message.role === 'user' ? 'Tú' : 'IA'}</span><div>{renderMessage(message.content)}</div></div>) : <div className="ai-empty">Pregunta sobre APIs, requests o código.</div>}{loading && <div className="ai-typing">IA está escribiendo…</div>}</div></div>
    <div className="ai-chat-actions"><button onClick={testExternalApi} disabled={loading}>Probar API externa</button></div>
    <form className="ai-chat-composer" onSubmit={(e) => { e.preventDefault(); send(); }}><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Escribe tu mensaje…" rows={2} /><button type="submit" disabled={loading || !draft.trim()}>Enviar</button></form>
  </aside>;
}
