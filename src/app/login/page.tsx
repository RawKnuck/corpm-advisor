"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim() || loading) return;

    setLoading(true);
    try {
      await signIn("credentials", {
        email: email.trim(),
        name: name.trim(),
        callbackUrl,
        redirect: true,
      });
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error("Google login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      border: "1px solid var(--border-color)",
      padding: "2rem",
      backgroundColor: "var(--input-bg)",
      width: "100%",
      maxWidth: "460px",
      margin: "4rem auto",
    }}>
      <h2 style={{
        fontSize: "1.6rem",
        fontWeight: "normal",
        textAlign: "center",
        marginBottom: "1rem",
        textTransform: "uppercase",
        letterSpacing: "1px",
      }}>
        Authentication Portal
      </h2>
      <div className="latex-divider" style={{ marginBottom: "1.5rem" }}></div>

      <p style={{
        textAlign: "justify",
        textJustify: "inter-word",
        fontSize: "0.95rem",
        marginBottom: "1.5rem",
      }}>
        Access to The Sovereign Advisor is restricted to authorized consultants.
        Please provide credentials or authenticate via Google to initiate session.
      </p>

      {error && (
        <div className="error-banner" style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Authentication failed: {error}. Please verify credentials.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Google Authentication */}
        <div>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="submit-btn"
            style={{ width: "100%" }}
          >
            {loading ? "Authenticating..." : "Login with Google"}
          </button>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          textAlign: "center",
          color: "gray",
          fontSize: "0.85rem",
        }}>
          <div style={{ flexGrow: 1, borderBottom: "0.5px solid var(--border-color)", opacity: 0.5 }}></div>
          <span style={{ padding: "0 10px", fontStyle: "italic" }}>or use credentials</span>
          <div style={{ flexGrow: 1, borderBottom: "0.5px solid var(--border-color)", opacity: 0.5 }}></div>
        </div>

        {/* Credentials Authentication Form */}
        <form onSubmit={handleCredentialsSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label htmlFor="name-input" style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold" }}>
              Name
            </label>
            <input
              id="name-input"
              type="text"
              required
              className="chat-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Niccolo"
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label htmlFor="email-input" style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: "bold" }}>
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              required
              className="chat-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. machiavelli@sovereign.advisor"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
            style={{ marginTop: "0.5rem" }}
          >
            {loading ? "Verifying..." : "Login with Credentials"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="centered-layout">
      <main className="paper-container" style={{ minHeight: "auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Suspense fallback={
          <div style={{ fontStyle: "italic", textAlign: "center", padding: "2rem" }}>
            Loading authentication forms...
          </div>
        }>
          <LoginContent />
        </Suspense>
      </main>
    </div>
  );
}
