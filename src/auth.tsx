import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import bogaLogo from "./assets/logo-boga.png";

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  error: string;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, nikBoga: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const STORAGE_KEY = "boga_tax_auth_session";
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Username atau password salah.";
  if (normalized.includes("email not confirmed")) return "Email belum dikonfirmasi. Silakan cek inbox email kamu terlebih dahulu.";
  if (normalized.includes("user already registered")) return "Email tersebut sudah terdaftar. Silakan login.";
  if (normalized.includes("password should be at least")) return "Password terlalu pendek. Gunakan minimal 6 karakter.";
  if (normalized.includes("rate limit")) return "Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.";
  return message || "Terjadi kesalahan. Silakan coba lagi.";
}

async function supabaseRequest(path: string, options: RequestInit = {}) {
  if (!configured) throw new Error("Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.");

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.msg || data?.message || data?.error_description || data?.error || "Authentication request failed.");
  }
  return data;
}

async function refreshSession(session: AuthSession): Promise<AuthSession> {
  const data = await supabaseRequest("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  const refreshed: AuthSession = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    user: data.user ?? session.user,
  };
  saveSession(refreshed);
  return refreshed;
}

function sessionIsExpired(session: AuthSession) {
  if (!session.expires_at) return false;
  // Refresh one minute before expiry.
  return session.expires_at * 1000 <= Date.now() + 60_000;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const stored = getStoredSession();
      if (!stored) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const active = sessionIsExpired(stored) ? await refreshSession(stored) : stored;
        if (!cancelled) setSession(active);
      } catch {
        clearStoredSession();
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => { cancelled = true; };
  }, []);

  const syncProfile = useCallback(async (user: AuthUser, accessToken: string) => {
    const metadata = user.user_metadata ?? {};
    const fullName = typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";
    const nikBoga = typeof metadata.nik_boga === "string" ? metadata.nik_boga.trim().toUpperCase() : "";

    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,full_name,nik_boga`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const existing = await response.json().catch(() => []);
    if (!response.ok) throw new Error(existing?.message || "Gagal memeriksa profil.");
    if (Array.isArray(existing) && existing.length > 0) return;
    if (!fullName && !nikBoga) return;

    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ id: user.id, full_name: fullName || null, nik_boga: nikBoga || null }),
    });

    if (!insertResponse.ok) {
      const data = await insertResponse.json().catch(() => ({}));
      if (data?.code === "23505") throw new Error("NIK Boga tersebut sudah terdaftar pada akun lain.");
      throw new Error(data?.message || "Gagal menyimpan profil.");
    }
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    setError("");
    const loginValue = username.trim();
    let email = loginValue.toLowerCase();

    if (/^BG\d{6}$/.test(loginValue.toUpperCase())) {
      const nikResponse = await supabaseRequest("/rest/v1/rpc/get_email_by_nik", {
        method: "POST",
        body: JSON.stringify({ p_nik: loginValue.toUpperCase() }),
      });
      email = Array.isArray(nikResponse) ? (nikResponse[0]?.email ?? "") : (nikResponse?.email ?? "");
      if (!email) throw new Error("NIK Boga belum terdaftar. Silakan login menggunakan email atau hubungi admin.");
    }

    const data = await supabaseRequest("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const next: AuthSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
      user: data.user,
    };
    saveSession(next);
    setSession(next);

    try {
      await syncProfile(next.user, next.access_token);
    } catch (profileError) {
      clearStoredSession();
      setSession(null);
      throw profileError;
    }
  }, [syncProfile]);

  const signUp = useCallback(async (email: string, password: string, name: string, nikBoga: string) => {
    setError("");
    const normalizedNik = nikBoga.trim().toUpperCase();
    if (!/^BG\d{6}$/.test(normalizedNik)) throw new Error("NIK Boga harus berformat BG + 6 angka, contoh BG000809.");

    const existingNik = await supabaseRequest("/rest/v1/rpc/get_email_by_nik", {
      method: "POST",
      body: JSON.stringify({ p_nik: normalizedNik }),
    });
    const existingEmail = Array.isArray(existingNik) ? (existingNik[0]?.email ?? "") : (existingNik?.email ?? "");
    if (existingEmail) throw new Error("NIK Boga tersebut sudah terdaftar. Silakan gunakan NIK lain atau login dengan NIK tersebut.");

    const data = await supabaseRequest("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        data: { full_name: name.trim(), nik_boga: normalizedNik },
      }),
    });

    if (data.access_token && data.user) {
      const next: AuthSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: data.expires_at ?? Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
        user: data.user,
      };
      saveSession(next);
      setSession(next);
      try {
        await syncProfile(next.user, next.access_token);
      } catch (profileError) {
        clearStoredSession();
        setSession(null);
        throw profileError;
      }
      return { needsEmailConfirmation: false };
    }

    return { needsEmailConfirmation: true };
  }, [syncProfile]);

  const signOut = useCallback(async () => {
    const current = getStoredSession();
    try {
      if (current?.access_token && configured) {
        await supabaseRequest("/auth/v1/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${current.access_token}` },
        });
      }
    } catch {
      // Clear the local session even if the network logout fails.
    } finally {
      clearStoredSession();
      setSession(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    loading,
    configured,
    error,
    signIn: async (username, password) => {
      try { await signIn(username, password); } catch (err) {
        const message = friendlyAuthError(err instanceof Error ? err.message : "");
        setError(message);
        throw new Error(message);
      }
    },
    signUp: async (email, password, name, nikBoga) => {
      try { return await signUp(email, password, name, nikBoga); } catch (err) {
        const message = friendlyAuthError(err instanceof Error ? err.message : "");
        setError(message);
        throw new Error(message);
      }
    },
    signOut,
    clearError: () => setError(""),
  }), [session, loading, error, signIn, signUp, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthShell><div style={{ textAlign: "center", color: "#666" }}>Memeriksa sesi login...</div></AuthShell>;
  }

  return user ? <>{children}</> : <AuthScreen />;
}

function AuthScreen() {
  const { signIn, signUp, configured, error, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [nikBoga, setNikBoga] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setMessage("");

    if (!configured) return;
    if (mode === "signup" && !name.trim()) return setMessage("Nama wajib diisi.");
    if (mode === "signup" && !/^BG\d{6}$/.test(nikBoga.trim().toUpperCase())) return setMessage("NIK Boga harus berformat BG + 6 angka, contoh BG000809.");
    if (mode === "signup" && !email.trim()) return setMessage("Email wajib diisi.");
    if (mode === "login" && !username.trim()) return setMessage("Username wajib diisi.");
    if (password.length < 6) return setMessage("Password minimal 6 karakter.");
    if (mode === "signup" && password !== confirmPassword) return setMessage("Konfirmasi password tidak sama.");

    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(username, password);
      } else {
        const result = await signUp(email, password, name, nikBoga);
        if (result.needsEmailConfirmation) {
          setMessage("Akun berhasil dibuat. Silakan cek email untuk konfirmasi akun, lalu login.");
          setMode("login");
          setPassword("");
          setConfirmPassword("");
        }
      }
    } catch {
      // Error is shown by AuthProvider.
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <div style={{ width: "100%", maxWidth: 430 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <img src={bogaLogo} alt="Boga Group" style={{ width: 92, height: "auto", display: "block", margin: "0 auto 14px", objectFit: "contain" }} />
          <div style={{ color: "#c8102e", fontSize: 11, fontWeight: 800, letterSpacing: ".12em", marginTop: 4 }}>KALKULATOR PAJAK</div>
          <h1 style={{ color: "#202020", fontSize: 25, lineHeight: 1.15, margin: "5px 0 0", fontWeight: 900 }}>PERHITUNGAN PAJAK BOGA GROUP</h1>
          <p style={{ color: "#666", fontSize: 13, margin: "8px 0 0" }}>Login diperlukan sebelum menggunakan kalkulator.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "2px solid #e0e0e0", padding: 24, boxShadow: "0 12px 35px rgba(0,0,0,.12)" }}>
          <div style={{ display: "flex", background: "#f4f4f4", borderRadius: 8, padding: 4, marginBottom: 20 }}>
            {(["login", "signup"] as const).map((item) => (
              <button key={item} type="button" onClick={() => { setMode(item); setMessage(""); clearError(); }} style={{ flex: 1, border: 0, borderRadius: 6, padding: "10px 8px", background: mode === item ? "#c8102e" : "transparent", color: mode === item ? "#fff" : "#666", fontWeight: 800, cursor: "pointer" }}>
                {item === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          {!configured && (
            <div style={{ padding: "12px 14px", background: "#fff7e6", border: "1px solid #f0c36d", borderLeft: "3px solid #d99000", borderRadius: 7, fontSize: 13, color: "#6b4b00", marginBottom: 16 }}>
              Authentication belum aktif. Admin perlu mengisi <b>VITE_SUPABASE_URL</b> dan <b>VITE_SUPABASE_ANON_KEY</b> pada environment website.
            </div>
          )}

          {(error || message) && (
            <div style={{ padding: "11px 13px", background: error ? "#fff1f2" : "#f0fdf4", border: `1px solid ${error ? "#f3b5bd" : "#a7e3bd"}`, borderLeft: `3px solid ${error ? "#c8102e" : "#18864b"}`, borderRadius: 7, fontSize: 13, color: error ? "#8b1024" : "#166534", marginBottom: 16 }}>
              {error || message}
            </div>
          )}

          <form onSubmit={submit}>
            {mode === "signup" ? (
              <>
                <Field label="Nama Lengkap" value={name} onChange={setName} placeholder="Nama kamu" autoComplete="name" />
                <Field label="NIK Boga" value={nikBoga} onChange={(value) => setNikBoga(value.toUpperCase().replace(/\s/g, ""))} placeholder="Contoh: BG000809" autoComplete="off" />
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="nama@boga.co.id" autoComplete="email" />
              </>
            ) : (
              <Field label="Username" value={username} onChange={setUsername} placeholder="Email atau NIK Boga" autoComplete="username" />
            )}
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Minimal 6 karakter" autoComplete={mode === "login" ? "current-password" : "new-password"} />
            {mode === "signup" && <Field label="Konfirmasi Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Ulangi password" autoComplete="new-password" />}
            <button disabled={busy || !configured} type="submit" style={{ width: "100%", border: 0, borderRadius: 8, padding: "13px 18px", background: busy || !configured ? "#e0e0e0" : "#c8102e", color: busy || !configured ? "#999" : "#fff", fontWeight: 900, fontSize: 15, cursor: busy || !configured ? "not-allowed" : "pointer", marginTop: 6 }}>
              {busy ? "Memproses..." : mode === "login" ? "Log In →" : "Create Account →"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 16, color: "#777", fontSize: 12 }}>
            {mode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
            <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); clearError(); }} style={{ border: 0, background: "none", color: "#c8102e", fontWeight: 800, cursor: "pointer", padding: 0 }}>
              {mode === "login" ? "Sign Up" : "Log In"}
            </button>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, autoComplete }: { label: string; type?: string; value: string; onChange: (value: string) => void; placeholder: string; autoComplete?: string }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#444", marginBottom: 6 }}>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} style={{ width: "100%", padding: "11px 12px", border: "2px solid #e0e0e0", borderRadius: 7, fontFamily: "inherit", fontSize: 14, outline: "none" }} />
    </label>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #fff 0%, #fff7f8 55%, #fdebed 100%)", padding: "40px 20px", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "'Nunito', sans-serif" }}>
      {children}
    </div>
  );
}
