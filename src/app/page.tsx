"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [messages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Greetings. I am your strategic advisor. Drawing from the pragmatism of Machiavelli and the wisdom of Greene, what situation inside the workplace, job interview, or business meeting do you need to navigate?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    async function checkAuth() {
      const session = await getSession();
      if (!session) {
        window.location.href = "/login";
      }
    }
    checkAuth();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setError(null);
    const userQuery = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Create new chat session using raw SQL backend
      const title = userQuery.length > 30 ? userQuery.substring(0, 30) + '...' : userQuery;
      const createRes = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });

      if (!createRes.ok) {
        throw new Error('Failed to initiate a new strategic session.');
      }

      const { chat } = await createRes.json();

      // Send the query to the advisor endpoint
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: chat.id,
          content: userQuery
        })
      });

      if (!chatRes.ok) {
        const errData = await chatRes.json();
        throw new Error(errData.error || 'Server responded with an error.');
      }

      // Navigate to the newly created chat page
      router.push(`/chat/${chat.id}`);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="sidebar-layout">
      <Sidebar />
      <div className="sidebar-main-content">
        <main className="paper-container">
          <header className="academic-header">
            <h1 className="academic-title">The Sovereign Advisor</h1>
            <p className="academic-subtitle">Strategic Counsel grounded in Machiavellian Realism and Power Dynamics</p>
            <div className="latex-divider"></div>
          </header>

          <section className="chat-log">
            {messages.map((m, idx) => (
              <div key={idx} className="message-block">
                <div className={`message-meta ${m.role === 'user' ? 'user' : 'advisor'}`}>
                  {m.role === 'user' ? 'Consultant (You)' : 'Advisor'}
                </div>
                <div className="message-content">{m.content}</div>
              </div>
            ))}

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
              <input
                type="text"
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your situation (e.g., job interview, office politics)..."
                disabled={loading}
                required
                autoFocus
              />
              <button type="submit" className="submit-btn" disabled={loading}>
                Consult
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

