"use client";
import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const VIOLET = "#9B59FF";
const BG = "#080808";
const SURFACE = "#111111";
const BORDER = "#222222";
const TEXT = "#F0F0F0";
const TEXT_DIM = "#666666";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password) return;
    if (password.length < 6) { setError("Parola trebuie să aibă minim 6 caractere."); return; }
    setLoading(true);
    setError("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError("Eroare la creare cont. Încearcă alt email.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: BG, display: "flex",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');`}</style>
      <div style={{
        width: 380, background: SURFACE, border: `1px solid ${BORDER}`,
        borderRadius: 14, padding: "36px 32px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 28, color: VIOLET, marginBottom: 8 }}>⬡</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: TEXT, fontFamily: "monospace", letterSpacing: 2 }}>
            MAILMIND
          </div>
          <div style={{ fontSize: 12, color: TEXT_DIM, marginTop: 4 }}>Creează cont nou</div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", background: "#181818",
              border: `1px solid ${BORDER}`, borderRadius: 8,
              color: TEXT, fontSize: 13, outline: "none",
              fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <input
            type="password"
            placeholder="Parolă (minim 6 caractere)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            style={{
              width: "100%", padding: "10px 14px", background: "#181818",
              border: `1px solid ${BORDER}`, borderRadius: 8,
              color: TEXT, fontSize: 13, outline: "none",
              fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: "#FF6B6B", marginBottom: 14, textAlign: "center" }}>
            {error}
          </div>
        )}

        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            width: "100%", padding: "11px", background: VIOLET,
            border: "none", borderRadius: 8, color: "#fff",
            fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Se încarcă..." : "Creează cont"}
        </button>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: TEXT_DIM }}>
          Ai deja cont?{" "}
          <a href="/login" style={{ color: VIOLET, textDecoration: "none" }}>
            Intră în cont
          </a>
        </div>
      </div>
    </div>
  );
}