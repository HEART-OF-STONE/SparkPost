"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type AuthUser = {
  id: string;
  email: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  creditBalance: number;
};

type Notice = {
  type: "success" | "error" | "info";
  text: string;
};

type MeResponse = {
  user: AuthUser | null;
};

function formatTimeLeft(seconds: number) {
  if (seconds <= 0) {
    return "0s";
  }

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  const cooldownActive = useMemo(() => {
    return cooldownEndsAt !== null && timeLeft > 0;
  }, [cooldownEndsAt, timeLeft]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSession() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load session.");
        }

        const data = (await response.json()) as MeResponse;
        setUser(data.user);

        if (data.user) {
          setEmail(data.user.email);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setNotice({
            type: "error",
            text:
              error instanceof Error
                ? error.message
                : "Unable to load your session right now.",
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSession(false);
        }
      }
    }

    void loadSession();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!cooldownEndsAt) {
      setTimeLeft(0);
      return undefined;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setCooldownEndsAt(null);
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [cooldownEndsAt]);

  async function refreshSession() {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to refresh session.");
    }

    const data = (await response.json()) as MeResponse;
    setUser(data.user);
    if (data.user) {
      setEmail(data.user.email);
    }
  }

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!email.trim()) {
      setNotice({ type: "error", text: "Enter an email address first." });
      return;
    }

    setIsSendingCode(true);

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfterSeconds = Math.max(1, Number(data?.retryAfterSeconds) || 60);
          setCooldownEndsAt(Date.now() + retryAfterSeconds * 1000);
          setNotice({
            type: "error",
            text: `Request too fast. Please wait ${formatTimeLeft(
              retryAfterSeconds,
            )} before asking for another code.`,
          });
          return;
        }

        if (response.status === 503) {
          setNotice({
            type: "error",
            text: typeof data?.error === "string" ? data.error : "服务暂时不可用，请稍后再试。",
          });
          return;
        }

        throw new Error(typeof data?.error === "string" ? data.error : "Unable to send verification code.");
      }

      const expiresAt = typeof data?.expiresAt === "string" ? data.expiresAt : null;
      const expiresText = expiresAt
        ? ` The code expires at ${new Date(expiresAt).toLocaleTimeString()}.`
        : "";
      const debugCode = typeof data?.debugCode === "string" ? data.debugCode : null;
      const debugCodeText = debugCode ? ` Debug code: ${debugCode}.` : "";

      setCode(debugCode ?? "");
      setNotice({
        type: "success",
        text: `Verification code sent to ${email}.${expiresText}${debugCodeText}`,
      });
      codeInputRef.current?.focus();
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error ? error.message : "Unable to send verification code.",
      });
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!email.trim()) {
      setNotice({ type: "error", text: "Enter the same email that received the code." });
      return;
    }

    if (!code.trim()) {
      setNotice({ type: "error", text: "Enter the verification code." });
      return;
    }

    setIsVerifyingCode(true);

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfterSeconds = Math.max(1, Number(data?.retryAfterSeconds) || 60);
          setCooldownEndsAt(Date.now() + retryAfterSeconds * 1000);
          setNotice({
            type: "error",
            text: `Verification requests are temporarily limited. Please wait ${formatTimeLeft(
              retryAfterSeconds,
            )} and try again.`,
          });
          return;
        }

        if (response.status === 503) {
          setNotice({
            type: "error",
            text: typeof data?.error === "string" ? data.error : "服务暂时不可用，请稍后再试。",
          });
          return;
        }

        throw new Error(typeof data?.error === "string" ? data.error : "Unable to verify code.");
      }

      const nextUser = data?.user;
      if (nextUser && typeof nextUser === "object" && "email" in nextUser) {
        const verifiedUser = nextUser as AuthUser;
        setUser(verifiedUser);
        setEmail(verifiedUser.email);
        setCode("");
        setCooldownEndsAt(null);
        setNotice({
          type: "success",
          text: data?.isNewUser === true
            ? "Account created and signed in successfully."
            : "Signed in successfully.",
        });
      } else {
        await refreshSession();
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to verify code.",
      });
    } finally {
      setIsVerifyingCode(false);
    }
  }

  async function handleLogout() {
    setNotice(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Unable to log out.");
      }

      setUser(null);
      setCode("");
      await refreshSession();
      setNotice({
        type: "info",
        text: "You have been signed out.",
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to log out.",
      });
    }
  }

  const sendCodeDisabled = isSendingCode || cooldownActive || !email.trim();
  const verifyCodeDisabled = isVerifyingCode || !email.trim() || !code.trim();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#1f2937_0%,_#0f172a_34%,_#020617_100%)] px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur md:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.14),transparent_38%,rgba(34,197,94,0.12)_100%)]" />
          <div className="relative space-y-8">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                SparkPost access
              </span>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Email login for the SparkPost MVP.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300">
                  Request a verification code, confirm it here, and land in the
                  authenticated workspace with your current credit balance.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-sm text-slate-400">Step 1</div>
                <div className="mt-2 font-medium text-white">Enter email</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-sm text-slate-400">Step 2</div>
                <div className="mt-2 font-medium text-white">Send code</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-sm text-slate-400">Step 3</div>
                <div className="mt-2 font-medium text-white">Verify and enter</div>
              </div>
            </div>

            {notice ? (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                  notice.type === "error"
                    ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
                    : notice.type === "success"
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                      : "border-sky-400/30 bg-sky-400/10 text-sky-100"
                }`}
              >
                {notice.text}
              </div>
            ) : null}

            {user ? (
              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <div className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
                  <div className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-200">
                    Signed in
                  </div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {user.email}
                  </div>
                  <div className="mt-2 text-sm text-emerald-100/80">
                    Credits available:{" "}
                    <span className="font-semibold text-white">
                      {user.creditBalance}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/10 px-5 font-medium text-white transition hover:bg-white/15"
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Authentication
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Send a code first, then verify it to create or reopen a
                      session.
                    </p>
                  </div>
                  {cooldownActive ? (
                    <div className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-100">
                      Resend in {formatTimeLeft(timeLeft)}
                    </div>
                  ) : null}
                </div>

                <form onSubmit={handleSendCode} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">
                      Email address
                    </span>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-white/8"
                    />
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={sendCodeDisabled}
                      className="inline-flex h-12 items-center justify-center rounded-full bg-cyan-400 px-5 font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                    >
                      {isSendingCode ? "Sending code..." : "Send code"}
                    </button>
                    <div className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                      Development mode will also show and autofill the debug code here.
                    </div>
                  </div>
                </form>

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-200">
                      Verification code
                    </span>
                    <input
                      ref={codeInputRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="123456"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 tracking-[0.35em] text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-white/8"
                    />
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      disabled={verifyCodeDisabled}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/10 px-5 font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/5 disabled:text-slate-400"
                    >
                      {isVerifyingCode ? "Verifying..." : "Verify code"}
                    </button>
                    <p className="text-sm text-slate-400">
                      We will create your account on first sign in and load your
                      current balance automatically.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-950/50 p-6 shadow-xl shadow-slate-950/30 backdrop-blur md:p-8">
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Current session
            </div>
            <div className="text-2xl font-semibold text-white">
              {isLoadingSession ? "Checking login state..." : user ? "Authenticated" : "Signed out"}
            </div>
          </div>

          <div className="space-y-3 text-sm leading-6 text-slate-300">
            <p>
              This page uses the existing auth endpoints directly. It requests a
              code, verifies it, then reloads the session from <code>/api/me</code>.
            </p>
            <p>
              Cooldown support is built in for resend throttling, so repeated
              requests stay aligned with the backend&apos;s <code>429</code> response.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <div className="font-medium text-white">Backend contract used</div>
            <ul className="mt-3 space-y-2">
              <li>
                <code>POST /api/auth/send-code</code> returns <code>429</code> with{" "}
                <code>retryAfterSeconds</code>.
              </li>
              <li>
                <code>POST /api/auth/verify-code</code> returns a user payload on
                success.
              </li>
              <li>
                <code>GET /api/me</code> returns <code>200</code> with{" "}
                <code>{"{ user: null }"}</code> when signed out.
              </li>
              <li>
                <code>POST /api/auth/logout</code> clears the session cookie.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
