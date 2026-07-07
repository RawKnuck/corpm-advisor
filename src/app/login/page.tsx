"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [loading, setLoading] = useState(false);

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
        Please authenticate via Google to initiate session.
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
