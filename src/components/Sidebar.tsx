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
    async function loadChats() {
      try {
        const res = await fetch("/api/chats");
        if (res.ok) {
          const data = await res.json();
          setChats(data.chats || []);
        }
      } catch (err) {
        console.error("Error fetching chats:", err);
      }
    }
    loadChats();
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
    e.stopPropagation(); // Prevent navigation
    if (!confirm("Are you sure you want to delete this strategic session?")) return;
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "DELETE",
      });
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

  const handleSignOut = async () => {
    const { signOut } = await import("next-auth/react");
    await signOut({ callbackUrl: "/login" });
  };

  if (isCollapsed) {
    return (
      <aside style={{
        width: "50px",
        borderRight: "1px solid var(--border-color)",
        backgroundColor: "#fcfbfa",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1rem 0",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}>
        <button
          onClick={() => setIsCollapsed(false)}
          title="Expand Sidebar"
          style={{
            background: "none",
            border: "1px solid var(--border-color)",
            color: "var(--text-color)",
            padding: "5px 10px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "1rem",
            marginBottom: "1rem",
          }}
        >
          →
        </button>
        <button
          onClick={handleNewChat}
          title="New Chat"
          style={{
            background: "none",
            border: "1px solid var(--border-color)",
            color: "var(--text-color)",
            padding: "5px 10px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "1rem",
          }}
        >
          ＋
        </button>
      </aside>
    );
  }

  return (
    <aside style={{
      width: "280px",
      borderRight: "1px solid var(--border-color)",
      backgroundColor: "#fcfbfa",
      display: "flex",
      flexDirection: "column",
      padding: "1.5rem 1rem",
      height: "100vh",
      position: "sticky",
      top: 0,
      overflowY: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{
          fontSize: "1.1rem",
          fontWeight: "normal",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          fontFamily: "inherit",
        }}>
          Sessions
        </h3>
        <button
          onClick={() => setIsCollapsed(true)}
          title="Collapse Sidebar"
          style={{
            background: "none",
            border: "1px solid var(--border-color)",
            color: "var(--text-color)",
            padding: "2px 8px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "0.85rem",
          }}
        >
          ←
        </button>
      </div>

      <button
        onClick={handleNewChat}
        disabled={loading}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: "none",
          border: "1px solid var(--border-color)",
          color: "var(--text-color)",
          fontFamily: "inherit",
          fontSize: "0.95rem",
          cursor: "pointer",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        {loading ? "Creating..." : "＋ New Consultation"}
      </button>

      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", marginBottom: "1.5rem" }}>
        {chats.length === 0 ? (
          <div style={{ fontStyle: "italic", fontSize: "0.9rem", color: "gray", padding: "10px 0" }}>
            No past sessions.
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => router.push(`/chat/${chat.id}`)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  border: isActive ? "1.5px solid var(--border-color)" : "1px solid transparent",
                  backgroundColor: isActive ? "rgba(0,0,0,0.03)" : "transparent",
                  cursor: "pointer",
                  fontSize: "0.95rem",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.02)";
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  marginRight: "8px",
                  fontWeight: isActive ? "bold" : "normal",
                  flexGrow: 1,
                }}>
                  {chat.title}
                </span>
                <button
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  title="Delete Session"
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent-color)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    padding: "2px 6px",
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      <div style={{ borderTop: "0.5px solid var(--border-color)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={handleSignOut}
          style={{
            width: "100%",
            padding: "6px 12px",
            background: "none",
            border: "1.5px solid var(--border-color)",
            color: "var(--text-color)",
            fontFamily: "inherit",
            fontSize: "0.9rem",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
