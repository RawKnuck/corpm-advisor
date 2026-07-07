"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  activeChatId?: string;
}

export default function Sidebar({ activeChatId }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const router = useRouter();

  const fetchChats = async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats || []);
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const handleNewChat = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Strategic Consultation" }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/chat/${data.chat.id}`);
      }
    } catch (err) {
      console.error("Error creating new chat:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this strategic session?")) return;
    try {
      const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (activeChatId === id) {
          router.push("/");
        } else {
          fetchChats();
        }
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  const startRename = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(id);
    setEditTitle(title);
  };

  const handleRename = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      if (res.ok) {
        setChats((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: editTitle.trim() } : c))
        );
      }
    } catch (err) {
      console.error("Error renaming chat:", err);
    } finally {
      setEditingChatId(null);
    }
  };

  const handleSignOut = async () => {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/login" });
  };

  if (isCollapsed) {
    return (
      <aside className="sidebar-collapsed">
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand Sidebar"
          className="sidebar-icon-btn"
        >
          →
        </button>
        <button
          onClick={handleNewChat}
          title="New Chat"
          className="sidebar-icon-btn"
        >
          ＋
        </button>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-label">Sessions</span>
        <button
          onClick={() => setIsCollapsed(true)}
          title="Collapse Sidebar"
          className="sidebar-collapse-btn"
        >
          ←
        </button>
      </div>

      <button
        onClick={handleNewChat}
        disabled={loading}
        className="sidebar-new-btn"
      >
        {loading ? "Creating..." : "＋ New Consultation"}
      </button>

      <div className="sidebar-chat-list">
        {chats.length === 0 ? (
          <div className="sidebar-empty">No past sessions.</div>
        ) : (
          chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const isEditing = chat.id === editingChatId;
            return (
              <div
                key={chat.id}
                onClick={() => !isEditing && router.push(`/chat/${chat.id}`)}
                className={`sidebar-chat-item${isActive ? " active" : ""}`}
                style={{ cursor: isEditing ? "default" : "pointer" }}
              >
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={() => handleRename(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(chat.id);
                      if (e.key === "Escape") setEditingChatId(null);
                    }}
                    autoFocus
                    className="sidebar-edit-input"
                  />
                ) : (
                  <>
                    <span className={`sidebar-chat-title${isActive ? " active" : ""}`}>
                      {chat.title}
                    </span>
                    <div className="sidebar-chat-actions">
                      <button
                        onClick={(e) => startRename(chat.id, chat.title, e)}
                        title="Rename Session"
                        className="sidebar-action-btn"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                        title="Delete Session"
                        className="sidebar-delete-btn"
                      >
                        ✕
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-footer">
        <button onClick={handleSignOut} className="sidebar-signout-btn">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
