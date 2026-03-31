"use client";

import Image from "next/image";
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

type ImageTaskResult = {
  id: string;
  status: string;
  prompt: string;
  model: string;
  costCredits: number;
  remainingCredits: number;
  assets: Array<{
    id: string;
    fileUrl: string;
    width: number | null;
    height: number | null;
  }>;
};

type GenerateImageResponse =
  | { ok: true; task: ImageTaskResult }
  | { error: string };

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

function getPrimaryImageUrl(task: ImageTaskResult | null) {
  return task?.assets[0]?.fileUrl ?? null;
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
  const [prompt, setPrompt] = useState(
    "A cinematic futuristic product scene with glowing edges, reflective glass, and dramatic studio lighting.",
  );
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generationTask, setGenerationTask] = useState<ImageTaskResult | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    if (user && promptInputRef.current) {
      promptInputRef.current.focus();
    }
  }, [user]);

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
            text:
              typeof data?.error === "string"
                ? data.error
                : "Service temporarily unavailable. Please try again later.",
          });
          return;
        }

        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Unable to send verification code.",
        );
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
            text:
              typeof data?.error === "string"
                ? data.error
                : "Service temporarily unavailable. Please try again later.",
          });
          return;
        }

        throw new Error(
          typeof data?.error === "string" ? data.error : "Unable to verify code.",
        );
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
          text:
            data?.isNewUser === true
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
      setGenerationTask(null);
      setGeneratedImageUrl(null);
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

  async function handleGenerateImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!prompt.trim()) {
      setNotice({ type: "error", text: "Enter a prompt first." });
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setGenerationTask(null);

    try {
      const response = await fetch("/api/generate/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ prompt }),
      });

      const data = (await response.json().catch(() => null)) as GenerateImageResponse | null;

      if (!response.ok) {
        const errorText =
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Unable to generate image.";
        setNotice({ type: "error", text: errorText });
        return;
      }

      if (!data || !("ok" in data) || data.ok !== true) {
        setNotice({ type: "error", text: "Image generation returned an unexpected payload." });
        return;
      }

      setGenerationTask(data.task);
      setGeneratedImageUrl(getPrimaryImageUrl(data.task));
      setNotice({
        type: "success",
        text: `Image generated successfully. ${data.task.assets.length} asset(s) created.`,
      });
      setUser((current) =>
        current
          ? {
              ...current,
              creditBalance: data.task.remainingCredits,
            }
          : current,
      );
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to generate image.",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  }

  const sendCodeDisabled = isSendingCode || cooldownActive || !email.trim();
  const verifyCodeDisabled = isVerifyingCode || !email.trim() || !code.trim();
  const generateDisabled = isGeneratingImage || !prompt.trim() || !user;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.20)_0%,_rgba(15,23,42,1)_35%,_rgba(2,6,23,1)_100%)] px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-[12rem] h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-[-7rem] left-[18%] h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur-xl md:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.14),transparent_38%,rgba(34,197,94,0.10)_100%)]" />
          <div className="relative space-y-8">
            <div className="space-y-4">
              <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                SparkPost access
              </span>
              <div className="space-y-3">
                <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Login, then create an image in one flow.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300">
                  Keep the auth and generation steps in one place: sign in, write a prompt,
                  generate, and review the result without leaving the page.
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
                <div className="mt-2 font-medium text-white">Sign in</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-sm text-slate-400">Step 3</div>
                <div className="mt-2 font-medium text-white">Generate image</div>
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
                    Credits available: <span className="font-semibold text-white">{user.creditBalance}</span>
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
                    <h2 className="text-lg font-semibold text-white">Authentication</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Send a code first, then verify it to create or reopen a session.
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
                      We will create your account on first sign in and load your current
                      balance automatically.
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]" />
          <div className="relative grid gap-6 p-6 md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Generation studio
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Create a single image from a prompt.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  This panel talks to the existing `/api/generate/image` backend route and
                  stays aligned with the current authenticated session.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Mode</div>
                  <div className="mt-1 text-sm font-medium text-white">Text to image</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Status</div>
                  <div className="mt-1 text-sm font-medium text-white">
                    {isLoadingSession ? "Checking..." : user ? "Ready" : "Sign in first"}
                  </div>
                </div>
              </div>
            </div>

            {user ? (
              <>
                <form onSubmit={handleGenerateImage} className="grid gap-4">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-inner shadow-black/20">
                    <label className="block">
                      <span className="mb-3 block text-sm font-medium text-slate-200">
                        Prompt
                      </span>
                      <textarea
                        ref={promptInputRef}
                        rows={6}
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="A cinematic product shot of a futuristic AI workspace, reflective glass, teal accents, dramatic rim light..."
                        className="min-h-36 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-4 text-sm leading-6 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/50 focus:bg-slate-950"
                      />
                    </label>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Authenticated flow
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Real backend route
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                          Credits-aware
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={generateDisabled}
                        className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-emerald-300 px-6 font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:from-slate-600 disabled:via-slate-600 disabled:to-slate-600 disabled:text-slate-300 disabled:shadow-none"
                      >
                        {isGeneratingImage ? "Generating..." : "Generate image"}
                      </button>
                    </div>
                  </div>
                </form>

                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">Result preview</div>
                        <div className="text-xs text-slate-400">
                          {generationTask
                            ? `Task ${generationTask.id} · ${generationTask.status}`
                            : "No image generated yet"}
                        </div>
                      </div>
                      <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-100">
                        {user.creditBalance} credits left
                      </div>
                    </div>

                    <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))]">
                      <div className="relative aspect-[4/3] w-full overflow-hidden">
                        {generatedImageUrl ? (
                          <Image
                            src={generatedImageUrl}
                            alt={generationTask?.prompt ?? "Generated image"}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="(max-width: 1024px) 100vw, 60vw"
                          />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
                            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-400">
                              Waiting for output
                            </div>
                            <p className="max-w-sm text-sm leading-6 text-slate-400">
                              The generated image will appear here once the backend returns
                              a `fileUrl`.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {generationTask ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              Task ID
                            </div>
                            <div className="mt-1 font-mono text-xs text-white">{generationTask.id}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              Model
                            </div>
                            <div className="mt-1 text-white">{generationTask.model}</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              Cost
                            </div>
                            <div className="mt-1 text-white">{generationTask.costCredits} credits</div>
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                              Status
                            </div>
                            <div className="mt-1 text-white">{generationTask.status}</div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-sm font-semibold text-white">Generation notes</div>
                      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                        <p>
                          Use a single prompt for now. This first pass intentionally stays in the
                          synchronous path so we can keep the UI and backend contract tight.
                        </p>
                        <p>
                          If the provider key is missing or the backend is unavailable, the error
                          will show above without breaking the page.
                        </p>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                      <div className="text-sm font-semibold text-white">Backend contract used</div>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                        <li>
                          <code>POST /api/generate/image</code> accepts <code>{"{ prompt }"}</code>
                        </li>
                        <li>
                          Success returns <code>task</code> with <code>id</code>, <code>status</code>, and <code>assets[0].fileUrl</code>
                        </li>
                        <li>
                          Missing image provider config returns <code>503</code> with <code>{"{ error }"}</code>
                        </li>
                        <li>
                          Not enough credits returns <code>402</code>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Locked preview
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Sign in to unlock the generation studio.
                  </h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                    The image-generation workspace appears after authentication so the page
                    stays focused on one flow: login, prompt, generate, review.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Step 1</div>
                      <div className="mt-2 text-sm font-medium text-white">Request a code</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Step 2</div>
                      <div className="mt-2 text-sm font-medium text-white">Verify sign in</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Step 3</div>
                      <div className="mt-2 text-sm font-medium text-white">Generate image</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.94))] p-5">
                  <div className="rounded-[1.25rem] border border-dashed border-cyan-400/20 bg-cyan-400/5 p-5">
                    <div className="text-sm font-medium text-cyan-100">Generation studio locked</div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      After login, the prompt editor and image preview will appear here.
                      The page already keeps the contract aligned with <code className="text-slate-100">POST /api/generate/image</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
