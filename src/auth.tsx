import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
  signUp: (email: string, password: string, name: string, nikBoga: string, registrationCode: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  clearError: () => void;
  profileReady: boolean;
  completeProfile: (name: string, nikBoga: string) => Promise<void>;
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
  if (normalized.includes("rate limit") || normalized.includes("too many requests") || normalized.includes("429")) return "Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.";
  if (normalized.includes("email rate limit")) return "Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.";
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

async function getProfile(userId: string, accessToken: string) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,full_name,nik_boga`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data?.message || "Gagal memeriksa profil.");
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileReady, setProfileReady] = useState(false);

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
        const profile = await getProfile(active.user.id, active.access_token);
        if (!cancelled) {
          setSession(active);
          setProfileReady(Boolean(profile?.nik_boga));
        }
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

    if (/^(BG|RBB)\d{6}$/.test(loginValue.toUpperCase())) {
      const nikResponse = await supabaseRequest("/rest/v1/rpc/get_email_by_nik", {
        method: "POST",
        body: JSON.stringify({ p_nik: loginValue.toUpperCase() }),
      });
      email = typeof nikResponse === "string"
        ? nikResponse
        : Array.isArray(nikResponse)
          ? (nikResponse[0]?.email ?? "")
          : (nikResponse?.email ?? "");
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
      const profile = await getProfile(next.user.id, next.access_token);
      setProfileReady(Boolean(profile?.nik_boga));
    } catch (profileError) {
      clearStoredSession();
      setSession(null);
      setProfileReady(false);
      throw profileError;
    }
  }, [syncProfile]);

  const signUp = useCallback(async (email: string, password: string, name: string, nikBoga: string, registrationCode: string) => {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();
    const normalizedNik = nikBoga.trim().toUpperCase();
    const normalizedRegistrationCode = registrationCode.trim().toUpperCase();

    if (!normalizedName) throw new Error("Nama Lengkap wajib diisi.");
    if (!/^[^\s@]+@boga\.co\.id$/i.test(normalizedEmail)) throw new Error("Email harus menggunakan alamat @boga.co.id.");
    if (!/^(BG|RBB)\d{6}$/.test(normalizedNik)) throw new Error("NIK Boga harus berformat BG + 6 angka atau RBB + 6 angka, contoh BG123456 atau RBB123456.");
    if (normalizedRegistrationCode !== "BOGA2002") throw new Error("Kode registrasi tidak valid. Silakan masukkan kode registrasi yang benar.");

    const existingNik = await supabaseRequest("/rest/v1/rpc/get_email_by_nik", {
      method: "POST",
      body: JSON.stringify({ p_nik: normalizedNik }),
    });
    const existingEmail = Array.isArray(existingNik) ? (existingNik[0]?.email ?? "") : (existingNik?.email ?? "");
    if (existingEmail) throw new Error("NIK Boga tersebut sudah terdaftar. Silakan gunakan NIK lain atau login dengan NIK tersebut.");

    const data = await supabaseRequest("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({
        email: normalizedEmail,
        password,
        data: { full_name: normalizedName, nik_boga: normalizedNik },
      }),
    });

    if (data.access_token && data.user) {
      // Confirm Email is OFF, so Supabase returns a session immediately.
      // For this app, a new user must still log in manually after Sign Up.
      // Save the profile while the temporary signup token is valid, then discard the session.
      try {
        await syncProfile(data.user, data.access_token);
      } catch (profileError) {
        throw profileError;
      }
      clearStoredSession();
      setSession(null);
      setProfileReady(false);
      return { needsEmailConfirmation: true };
    }

    return { needsEmailConfirmation: true };
  }, [syncProfile]);

  const completeProfile = useCallback(async (name: string, nikBoga: string) => {
    if (!session?.access_token || !session.user) throw new Error("Sesi login tidak ditemukan. Silakan login kembali.");
    const normalizedNik = nikBoga.trim().toUpperCase();
    const normalizedName = name.trim();
    if (!normalizedName) throw new Error("Nama Lengkap wajib diisi.");
    if (!/^(BG|RBB)\d{6}$/.test(normalizedNik)) throw new Error("NIK Boga harus berformat BG + 6 angka atau RBB + 6 angka, contoh BG123456 atau RBB123456.");

    const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ id: session.user.id, full_name: normalizedName, nik_boga: normalizedNik }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data?.code === "23505") throw new Error("NIK Boga tersebut sudah terdaftar pada akun lain.");
      throw new Error(data?.message || "Gagal menyimpan NIK Boga.");
    }
    setProfileReady(true);
  }, [session]);

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
      setProfileReady(false);
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
    signUp: async (email, password, name, nikBoga, registrationCode) => {
      try { return await signUp(email, password, name, nikBoga, registrationCode); } catch (err) {
        const message = friendlyAuthError(err instanceof Error ? err.message : "");
        setError(message);
        throw new Error(message);
      }
    },
    signOut,
    clearError: () => setError(""),
    profileReady,
    completeProfile,
  }), [session, loading, error, signIn, signUp, signOut, profileReady, completeProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, profileReady } = useAuth();

  if (loading) {
    return <AuthShell><div style={{ textAlign: "center", color: "#666" }}>Memeriksa sesi login...</div></AuthShell>;
  }

  if (!user) return <AuthScreen />;
  if (!profileReady) return <CompleteProfileScreen />;
  return <>{children}</>;
}

function CompleteProfileScreen() {
  const { user, completeProfile, error, clearError, signOut } = useAuth();
  const metadata = user?.user_metadata ?? {};
  const initialName = typeof metadata.full_name === "string" ? metadata.full_name : "";
  const [name, setName] = useState(initialName);
  const [nikBoga, setNikBoga] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setMessage("");
    const normalizedNik = nikBoga.trim().toUpperCase();
    if (!name.trim()) return setMessage("Nama Lengkap wajib diisi.");
    if (!/^(BG|RBB)\d{6}$/.test(normalizedNik)) return setMessage("NIK Boga harus berformat BG + 6 angka atau RBB + 6 angka, contoh BG123456 atau RBB123456.");
    setBusy(true);
    try {
      await completeProfile(name, normalizedNik);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan data akun.");
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
          <h1 style={{ color: "#202020", fontSize: 25, lineHeight: 1.15, margin: "5px 0 0", fontWeight: 900 }}>LENGKAPI DATA AKUN</h1>
          <p style={{ color: "#666", fontSize: 13, margin: "8px 0 0" }}>Lengkapi NIK Boga kamu sebelum menggunakan kalkulator.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, border: "2px solid #e0e0e0", padding: 24, boxShadow: "0 12px 35px rgba(0,0,0,.12)" }}>
          {(error || message) && (
            <div style={{ padding: "11px 13px", background: error ? "#fff1f2" : "#f0fdf4", border: `1px solid ${error ? "#f3b5bd" : "#a7e3bd"}`, borderLeft: `3px solid ${error ? "#c8102e" : "#18864b"}`, borderRadius: 7, fontSize: 13, color: error ? "#8b1024" : "#166534", marginBottom: 16 }}>
              {error || message}
            </div>
          )}
          <form onSubmit={submit}>
            <Field label="Nama Lengkap" value={name} onChange={setName} placeholder="Nama kamu" autoComplete="name" />
            <Field label="NIK Boga" value={nikBoga} onChange={(value) => setNikBoga(value.toUpperCase().replace(/\s/g, ""))} placeholder="Contoh: BG123456 / RBB123456" autoComplete="off" />
            <button disabled={busy} type="submit" style={{ width: "100%", border: 0, borderRadius: 8, padding: "13px 18px", background: busy ? "#e0e0e0" : "#c8102e", color: busy ? "#999" : "#fff", fontWeight: 900, fontSize: 15, cursor: busy ? "not-allowed" : "pointer", marginTop: 6 }}>
              {busy ? "Menyimpan..." : "Simpan & Lanjut →"}
            </button>
          </form>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button type="button" onClick={signOut} style={{ border: 0, background: "none", color: "#c8102e", fontWeight: 800, cursor: "pointer", padding: 0, fontSize: 12 }}>Keluar</button>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

function AuthScreen() {
  const { signIn, signUp, configured, error, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [nikBoga, setNikBoga] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submittingRef = useRef(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    clearError();
    setMessage("");

    if (!configured) return;
    if (mode === "signup" && !name.trim()) return setMessage("Nama wajib diisi.");
    if (mode === "signup" && !/^(BG|RBB)\d{6}$/.test(nikBoga.trim().toUpperCase())) return setMessage("NIK Boga harus berformat BG + 6 angka atau RBB + 6 angka, contoh BG123456 atau RBB123456.");
    if (mode === "signup" && !email.trim()) return setMessage("Email wajib diisi.");
    if (mode === "signup" && !/^[^\s@]+@boga\.co\.id$/i.test(email.trim())) return setMessage("Email harus menggunakan alamat @boga.co.id.");
    if (mode === "signup" && registrationCode.trim().toUpperCase() !== "BOGA2002") return setMessage("Kode registrasi tidak valid. Silakan masukkan kode registrasi yang benar.");
    if (mode === "login" && !username.trim()) return setMessage("Username wajib diisi.");
    if (password.length < 6) return setMessage("Password minimal 6 karakter.");
    if (mode === "signup" && password !== confirmPassword) return setMessage("Konfirmasi password tidak sama.");

    submittingRef.current = true;
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(username, password);
      } else {
        const result = await signUp(email, password, name, nikBoga, registrationCode);
        if (result.needsEmailConfirmation) {
          setMessage("Akun berhasil dibuat. Silakan login kembali menggunakan email atau NIK Boga.");
          setMode("login");
          setPassword("");
          setConfirmPassword("");
        }
      }
    } catch {
      // Error is shown by AuthProvider.
    } finally {
      submittingRef.current = false;
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
                <Field label="NIK Boga" value={nikBoga} onChange={(value) => setNikBoga(value.toUpperCase().replace(/\s/g, ""))} placeholder="Contoh: BG123456 / RBB123456" autoComplete="off" />
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="nama@boga.co.id" autoComplete="email" />
                <Field label="Kode Registrasi" value={registrationCode} onChange={(value) => setRegistrationCode(value.toUpperCase().replace(/\s/g, ""))} placeholder="Masukkan kode registrasi" autoComplete="off" />
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
