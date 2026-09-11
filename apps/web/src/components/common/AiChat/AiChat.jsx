import { useEffect, useMemo, useState, useRef } from 'react';
import './AiChat.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const initialChat = () => ({ id: crypto.randomUUID(), title: 'Nuevo chat', messages: [] });

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ai-code-block-wrapper">
      <div className="ai-code-block-header">
        <span className="ai-code-lang">{language || 'code'}</span>
        <button type="button" className="ai-code-copy-btn" onClick={handleCopy}>
          {copied ? '✓ Copiado' : '📋 Copiar'}
        </button>
      </div>
      <pre className="ai-code-block">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderFormattedMarkdown(text) {
  if (!text) return null;

  // Split by code blocks ```lang\ncode```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const prose = text.substring(lastIndex, match.index);
      elements.push(<span key={`prose-${lastIndex}`}>{renderInlineMarkdown(prose)}</span>);
    }
    const lang = match[1] || 'code';
    const code = match[2];
    elements.push(<CodeBlock key={`code-${match.index}`} code={code} language={lang} />);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    elements.push(<span key={`prose-${lastIndex}`}>{renderInlineMarkdown(text.substring(lastIndex))}</span>);
  }

  return elements;
}

function renderInlineMarkdown(text) {
  // Split paragraphs and line breaks
  const lines = text.split('\n');

  return lines.map((line, lIdx) => {
    // Check if list item
    const isBullet = /^\s*[-*]\s+(.*)/.exec(line);
    const isNumbered = /^\s*(\d+)\.\s+(.*)/.exec(line);

    let content = line;
    if (isBullet) content = isBullet[1];
    if (isNumbered) content = isNumbered[2];

    // Process bold (**text**), italic (*text*), inline code (`code`)
    const parts = [];
    const inlineRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let inlineLast = 0;
    let iMatch;

    while ((iMatch = inlineRegex.exec(content)) !== null) {
      if (iMatch.index > inlineLast) {
        parts.push(content.substring(inlineLast, iMatch.index));
      }
      const token = iMatch[0];
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(<code key={iMatch.index} className="ai-inline-code">{token.slice(1, -1)}</code>);
      } else if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={iMatch.index}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={iMatch.index}>{token.slice(1, -1)}</em>);
      }
      inlineLast = iMatch.index + token.length;
    }

    if (inlineLast < content.length) {
      parts.push(content.substring(inlineLast));
    }

    if (isBullet) {
      return (
        <div key={lIdx} className="ai-list-item ai-list-item--bullet">
          <span className="ai-list-dot">•</span>
          <span>{parts}</span>
        </div>
      );
    }
    if (isNumbered) {
      return (
        <div key={lIdx} className="ai-list-item ai-list-item--numbered">
          <span className="ai-list-num">{isNumbered[1]}.</span>
          <span>{parts}</span>
        </div>
      );
    }

    return (
      <div key={lIdx} className="ai-prose-line">
        {parts.length ? parts : <br />}
      </div>
    );
  });
}

export default function AiChat({ isOpen, onClose }) {
  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const messagesEndRef = useRef(null);

  const active = useMemo(() => chats.find((chat) => chat.id === activeId) || chats[0], [chats, activeId]);

  const loadChats = async () => {
    try {
      const r = await fetch(`${API_URL}/api/ai/chats`, { credentials: 'include' });
      if (!r.ok) return;
      const data = await r.json();
      const hydrated = data.map((chat) => ({
        ...chat,
        messages: Array.isArray(chat.messages) ? chat.messages : [],
      }));
      if (hydrated.length) {
        setChats(hydrated);
        if (!activeId || !hydrated.some((c) => c.id === activeId)) {
          setActiveId(hydrated[0].id);
        }
      } else {
        newChat();
      }
    } catch {
      setChats([initialChat()]);
    }
  };

  useEffect(() => {
    if (isOpen) loadChats();
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages, loading]);

  const updateChat = (messages, newTitle = null) => {
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === active?.id
          ? {
              ...chat,
              messages,
              title: newTitle || (chat.title === 'Nuevo chat' && messages[0] ? messages[0].content.slice(0, 28) : chat.title),
            }
          : chat
      )
    );
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || loading || !active) return;

    const history = [...(active.messages || []), { role: 'user', content: text }];
    updateChat(history);
    setDraft('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/ai/chats/${active.id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'No se pudo consultar el modelo');

      updateChat([...history, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      updateChat([...history, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const newChat = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ai/chats`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nuevo chat' }),
      });
      const chat = response.ok ? await response.json() : initialChat();
      setChats((prev) => [chat, ...prev]);
      setActiveId(chat.id);
    } catch {
      const fallback = initialChat();
      setChats((prev) => [fallback, ...prev]);
      setActiveId(fallback.id);
    }
  };

  const handleRenameChat = async (chatId) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      await fetch(`${API_URL}/api/ai/chats/${chatId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle.trim() }),
      });
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, title: editingTitle.trim() } : c))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setEditingChatId(null);
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/api/ai/chats/${chatId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const remaining = chats.filter((c) => c.id !== chatId);
      setChats(remaining);
      if (activeId === chatId) {
        if (remaining.length) {
          setActiveId(remaining[0].id);
        } else {
          newChat();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <aside className={`ai-chat-drawer ${isOpen ? 'is-open' : ''}`} aria-label="Asistente IA" aria-hidden={!isOpen}>
      <header className="ai-chat-header">
        <div>
          <div className="ai-chat-title-row">
            <span className="ai-sparkle-icon">✦</span>
            <strong>Asistente IA API Vault</strong>
          </div>
          <small>{active?.messages?.length || 0} mensajes · Respuestas inteligentes y código</small>
        </div>
        <button type="button" className="ai-close-btn" onClick={onClose} title="Cerrar Asistente">
          ✕
        </button>
      </header>

      <div className="ai-chat-body">
        {/* Chat History Sidebar */}
        <div className="ai-chat-history">
          <button type="button" className="new-chat-btn" onClick={newChat}>
            ＋ Nuevo chat
          </button>
          <div className="ai-chat-history-list">
            {chats.map((chat) => {
              const isCurrent = chat.id === active?.id;
              const isEditing = editingChatId === chat.id;

              return (
                <div
                  key={chat.id}
                  className={`ai-chat-tab ${isCurrent ? 'active' : ''}`}
                  onClick={() => {
                    if (!isEditing) setActiveId(chat.id);
                  }}
                >
                  {isEditing ? (
                    <input
                      type="text"
                      className="ai-chat-edit-input"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleRenameChat(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameChat(chat.id);
                        if (e.key === 'Escape') setEditingChatId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="ai-chat-tab-title" title={chat.title}>
                        {chat.title || 'Chat'}
                      </span>
                      <div className="ai-chat-tab-actions">
                        <button
                          type="button"
                          className="ai-tab-action-btn"
                          title="Renombrar chat"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingChatId(chat.id);
                            setEditingTitle(chat.title || '');
                          }}
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="ai-tab-action-btn ai-tab-action-btn--delete"
                          title="Eliminar chat"
                          onClick={(e) => handleDeleteChat(e, chat.id)}
                        >
                          🗑
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Message Thread */}
        <div className="ai-chat-messages">
          {active?.messages?.length ? (
            active.messages.map((message, i) => (
              <div key={i} className={`ai-message ${message.role}`}>
                <div className="ai-message-header">
                  <span className="ai-role-badge">
                    {message.role === 'user' ? 'Tú' : '✦ Asistente API'}
                  </span>
                </div>
                <div className="ai-message-content">
                  {renderFormattedMarkdown(message.content)}
                </div>
              </div>
            ))
          ) : (
            <div className="ai-empty-state">
              <div className="ai-empty-icon">✦</div>
              <h3>¿En qué puedo ayudarte hoy?</h3>
              <p>Pregúntame sobre diseño de endpoints, payloads JSON, scripts de pre-solicitud, headers o depuración de APIs.</p>
            </div>
          )}
          {loading && (
            <div className="ai-typing-indicator">
              <span className="ai-dot" />
              <span className="ai-dot" />
              <span className="ai-dot" />
              <span>Generando respuesta...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Composer Input */}
      <form
        className="ai-chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escribe tu mensaje… (Enter para enviar, Shift+Enter para salto)"
          rows={2}
        />
        <button type="submit" disabled={loading || !draft.trim()} title="Enviar mensaje">
          <span>Enviar</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </aside>
  );
}
