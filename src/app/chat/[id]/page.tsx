"use client";

import { useState, useRef, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { renderMarkdown } from '@/lib/markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ChatPage({ params }: PageProps) {
  const { id: chatId } = use(params);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasLoadedInitial = useRef(false);

  const lastUserMsgIdx = [...messages].reverse().findIndex(m => m.role === 'user');
  const lastUserIdx = lastUserMsgIdx !== -1 ? messages.length - 1 - lastUserMsgIdx : -1;

  // Authentication check and history fetch
  useEffect(() => {
    async function init() {
      hasLoadedInitial.current = false;
      setInitializing(true);
      const session = await getSession();
      if (!session) {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch(`/api/chats/${chatId}/messages`);
        if (!res.ok) {
          if (res.status === 404 || res.status === 403) {
            router.push("/");
            return;
          }
          throw new Error("Failed to load conversation history.");
        }
        const data = await res.json();
        
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          // If no messages yet, show default advisor greeting
          setMessages([
            {
              role: 'assistant',
              content: 'Greetings. I am your strategic advisor. Drawing from the pragmatism of Machiavelli and the wisdom of Greene, what situation inside the workplace, job interview, or business meeting do you need to navigate?'
            }
          ]);
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setInitializing(false);
        // Snap to last user message instantly on load
        setTimeout(() => {
          const scrollTarget = document.getElementById("last-user-message");
          if (scrollTarget) {
            scrollTarget.scrollIntoView({ behavior: 'instant', block: 'start' });
          } else {
            chatEndRef.current?.scrollIntoView({ behavior: 'instant' });
          }
          hasLoadedInitial.current = true;
        }, 50);
      }
    }
    init();
  }, [chatId, router]);

  // Auto scroll to bottom
  useEffect(() => {
    if (!hasLoadedInitial.current) return;
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      if (form) {
        form.requestSubmit();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setError(null);
    const userQuery = input.trim();
    
    // Optimistically update user's message in UI
    const userMessage: Message = { role: 'user', content: userQuery };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          content: userQuery
        })
      });

      if (!chatRes.ok) {
        const errData = await chatRes.json();
        throw new Error(errData.error || 'Server responded with an error.');
      }

      const data = await chatRes.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sidebar-layout">
      <Sidebar activeChatId={chatId} />
      <div className="sidebar-main-content">
        <main className="paper-container">
          <header className="academic-header">
            <h1 className="academic-title">The Sovereign Advisor</h1>
            <p className="academic-subtitle">Strategic Counsel grounded in Machiavellian Realism and Power Dynamics</p>
            <div className="latex-divider"></div>
          </header>

          <section className="chat-log">
            {initializing ? (
              <>
                <div className="skeleton-msg">
                  <div className="skeleton-meta"></div>
                  <div className="skeleton-line" style={{ width: "90%" }}></div>
                  <div className="skeleton-line" style={{ width: "95%" }}></div>
                  <div className="skeleton-line" style={{ width: "50%" }}></div>
                </div>
                <div className="skeleton-msg user">
                  <div className="skeleton-meta user"></div>
                  <div className="skeleton-line user" style={{ width: "40%" }}></div>
                </div>
                <div className="skeleton-msg">
                  <div className="skeleton-meta"></div>
                  <div className="skeleton-line" style={{ width: "92%" }}></div>
                  <div className="skeleton-line" style={{ width: "85%" }}></div>
                  <div className="skeleton-line" style={{ width: "30%" }}></div>
                </div>
              </>
            ) : (
              messages.map((m, idx) => (
                <div 
                  key={idx} 
                  id={idx === lastUserIdx ? "last-user-message" : undefined}
                  className="message-block"
                >
                  <div className={`message-meta ${m.role === 'user' ? 'user' : 'advisor'}`}>
                    {m.role === 'user' ? 'Consultant (You)' : 'Advisor'}
                  </div>
                  <div className="message-content">{renderMarkdown(m.content)}</div>
                </div>
              ))
            )}

            {loading && (
              <div className="status-indicator">
                The Advisor is formulating counsel...
              </div>
            )}

            {error && (
              <div className="error-banner">
                Error: {error}
              </div>
            )}
            
            <div ref={chatEndRef} />
          </section>

          <form onSubmit={handleSubmit} className="input-form">
            <div className="input-row">
              <textarea
                ref={textareaRef}
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your situation (e.g., job interview, office politics)..."
                disabled={loading || initializing}
                required
                autoFocus
                rows={1}
                style={{
                  resize: 'none',
                  overflowY: 'auto',
                  minHeight: '44px',
                  maxHeight: '200px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  lineHeight: '1.4',
                }}
              />
              <button type="submit" className="submit-btn" disabled={loading || initializing}>
                Consult
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
