"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type Locale = "zh" | "en";
type Notice = { type: "success" | "error" | "info"; text: string };
type AuthStatus = "checking" | "signedOut" | "signedIn";
type SystemStatus = "unknown" | "available" | "unavailable";
type InteractionStatus = "checking" | "ready" | "authRequired" | "generating";
type ResultStatus = "empty" | "success" | "error";
type AuthUser = { id: string; email: string; createdAt: string; emailVerifiedAt: string | null; lastLoginAt: string | null; creditBalance: number };
type MeResponse = { user: AuthUser | null };
type ImageTaskResult = { id: string; status: string; prompt: string; createdAt: string; completedAt: string | null; model: string | null; costCredits: number; remainingCredits: number; assets: Array<{ id: string; fileUrl: string; width: number | null; height: number | null }> };
type GenerateImageResponse = { ok: true; task: ImageTaskResult } | { error: string };

type Copy = {
  signIn: string; signOut: string; close: string; generate: string; generating: string; credits: string;
  signedOut: string; signedIn: string; checking: string; ready: string; authRequired: string;
  providerAvailable: string; providerUnavailable: string; providerUnknown: string; resultEmpty: string; resultSuccess: string; resultError: string;
  badge: string; tagline: string; heroEyebrow: string; landingTitle: string; landingBody: string; landingHint: string; keepPrompt: string;
  promptLabel: string; landingPromptPlaceholder: string; workspacePromptPlaceholder: string; workspacePromptHint: string;
  previewTitle: string; previewBody: string; previewCards: Array<[string, string, string]>; pathTitle: string; pathItems: string[];
  authTitle: string; authBody: string; email: string; code: string; sendCode: string; sendingCode: string; verify: string; verifying: string; authHint: string; cooldown: string;
  workspaceEyebrow: string; workspaceTitle: string; workspaceBody: string; runtimeTitle: string; runtimeBody: string; notesTitle: string; notesItems: string[];
  resultTitle: string; resultEmptyTitle: string; resultEmptyBody: string; latest: string; taskTitle: string; taskId: string; model: string; cost: string; createdAt: string; completedAt: string; accountTitle: string;
  ctaPrimary: string; ctaSecondary: string;
  sessionLoadFailed: string; sessionRefreshFailed: string; enterEmail: string; enterPrompt: string; enterSameEmail: string; enterCode: string; sentCode: string; requestTooFast: string; verifyTooFast: string; signedInNewNotice: string; signedInExistingNotice: string; signedOutNotice: string; loginToContinue: string; generateSuccess: string; unexpectedPayload: string; imagePreviewUnavailable: string;
};

const copy: Record<Locale, Copy> = {
  zh: {
    signIn: "登录", signOut: "退出登录", close: "关闭", generate: "生成图片", generating: "生成中...", credits: "积分",
    signedOut: "未登录", signedIn: "已登录", checking: "检查中", ready: "已就绪", authRequired: "需要登录",
    providerAvailable: "Provider 可用", providerUnavailable: "Provider 不可用", providerUnknown: "Provider 待确认", resultEmpty: "暂无结果", resultSuccess: "生成成功", resultError: "生成失败",
    badge: "SparkPost AI Studio", tagline: "面向内容团队的 AI 生图工作台", heroEyebrow: "先体验预览，再进入工作台", landingTitle: "先感受到产品能力，再在关键动作时触发登录。", landingBody: "SparkPost 首页现在更像一款正式 AI SaaS：先展示价值、风格和结果预览，再在真正点击生成时进入登录流程。", landingHint: "你在登录前输入的 prompt 会被保留，登录后尽量继续原来的动作。", keepPrompt: "Prompt 会在登录前后保留。",
    promptLabel: "Prompt", landingPromptPlaceholder: "例如：为科技品牌做一张电影感产品 KV，玻璃材质、青绿色辉光、深色背景、强烈边缘光。", workspacePromptPlaceholder: "例如：一张高端 AI SaaS 首页视觉，玻璃卡片、青绿色轮廓光、深色界面、电影级布光。", workspacePromptHint: "当前仍是同步单图路径，先把单次生成体验做顺，再扩历史、下载和发布流程。",
    previewTitle: "预览体验", previewBody: "Landing 负责建立信心，Workspace 负责完成动作。首页不再只是联调页。", previewCards: [["风格", "风格探索", "先写 prompt，快速建立视觉方向和画面气质。"], ["预览", "结果预判", "把结果形态、错误反馈和积分变化统一到一个产品界面。"], ["流程", "后续扩展", "下载、保存和一键发布可以留给下一阶段。"]], pathTitle: "当前产品路径", pathItems: ["未登录先看产品，不一上来就是登录墙。", "点击 Generate image 时再触发登录。", "登录后进入真正的 Generation Studio，不再把 auth panel 长期并排展示。"],
    authTitle: "登录后继续刚才的生成流程", authBody: "通过验证码进入工作台。系统会尽量保留当前 prompt，并在登录成功后继续生成动作。", email: "邮箱", code: "验证码", sendCode: "发送验证码", sendingCode: "发送中...", verify: "验证并进入工作台", verifying: "验证中...", authHint: "开发模式下如果后端返回 debug code，会自动填入这里。", cooldown: "可再次发送",
    workspaceEyebrow: "Generation Studio", workspaceTitle: "登录后直接进入真正的工作台。", workspaceBody: "主界面聚焦 prompt、生成动作、结果预览和任务信息，不再长期保留一大块登录区域。", runtimeTitle: "运行状态", runtimeBody: "把 auth、system、interaction、result 四层状态拆开显示，让用户一眼知道当前能不能生成。", notesTitle: "工作台说明", notesItems: ["结果区优先级高于说明区，页面更像真实工具而不是 demo。", "如果图片 provider 未配置，页面会明确暴露服务问题，方便联调。"],
    resultTitle: "结果预览", resultEmptyTitle: "等待生成结果", resultEmptyBody: "提交 prompt 后，这里会显示最新结果，同时更新任务状态和积分变化。", latest: "最新输出", taskTitle: "任务信息", taskId: "任务 ID", model: "模型", cost: "消耗", createdAt: "创建时间", completedAt: "完成时间", accountTitle: "账户",
    ctaPrimary: "开始生成", ctaSecondary: "查看工作台",
    sessionLoadFailed: "当前无法加载会话状态。", sessionRefreshFailed: "当前无法刷新会话状态。", enterEmail: "请先输入邮箱。", enterPrompt: "请先输入 prompt。", enterSameEmail: "请输入接收验证码的同一个邮箱。", enterCode: "请输入验证码。", sentCode: "验证码已发送到 {email}。{expires}{debug}", requestTooFast: "请求过快，请在 {time} 后再试。", verifyTooFast: "验证请求受限，请在 {time} 后再试。", signedInNewNotice: "账户创建成功，已进入工作台。", signedInExistingNotice: "登录成功，已进入工作台。", signedOutNotice: "你已退出登录。", loginToContinue: "请先登录，我们会保留你刚才输入的 prompt。", generateSuccess: "图片生成成功，已创建 {count} 个资源。", unexpectedPayload: "图片接口返回了未预期的数据结构。", imagePreviewUnavailable: "图片已生成，但当前页面无法展示返回的文件路径。"
  },
  en: {
    signIn: "Sign in", signOut: "Log out", close: "Close", generate: "Generate image", generating: "Generating...", credits: "Credits",
    signedOut: "Signed out", signedIn: "Signed in", checking: "Checking", ready: "Ready", authRequired: "Auth required",
    providerAvailable: "Provider available", providerUnavailable: "Provider unavailable", providerUnknown: "Provider unknown", resultEmpty: "No result yet", resultSuccess: "Success", resultError: "Error",
    badge: "SparkPost AI Studio", tagline: "AI image workspace for modern content teams", heroEyebrow: "Preview first, workspace after sign-in", landingTitle: "Feel the product before auth gets in the way.", landingBody: "SparkPost should open like a real AI SaaS: clear value, visual confidence, and a previewable prompt flow before sign-in is required.", landingHint: "The prompt typed before sign-in stays in place so the flow can continue after auth.", keepPrompt: "Your prompt stays with you through sign-in.",
    promptLabel: "Prompt", landingPromptPlaceholder: "For example: create a premium product key visual with glass surfaces, teal glow, dark backdrop, and cinematic edge lighting.", workspacePromptPlaceholder: "For example: a premium AI SaaS homepage visual with glass cards, teal rim light, dark interface framing, and cinematic lighting.", workspacePromptHint: "This is still the synchronous single-image path. History, download, and publishing can come later.",
    previewTitle: "Preview experience", previewBody: "Landing builds confidence. Workspace completes the job. The homepage should not feel like a debug panel.", previewCards: [["Style", "Style exploration", "Shape direction and mood before you spend a generation attempt."], ["Preview", "Output preview", "Keep result, error feedback, and credits in one product surface."], ["Flow", "Future workflow", "Download, save, and publishing can arrive later without bloating this step."]], pathTitle: "Current product path", pathItems: ["No login wall on first load.", "Auth is triggered when Generate image is clicked.", "After sign-in, the screen becomes a true Generation Studio rather than an auth demo."],
    authTitle: "Sign in, then continue the generation you already started", authBody: "Use email verification to enter the studio. The current prompt is preserved so the action can continue after sign-in.", email: "Email", code: "Verification code", sendCode: "Send code", sendingCode: "Sending...", verify: "Verify and enter studio", verifying: "Verifying...", authHint: "In development, the debug code is autofilled here when the backend returns it.", cooldown: "Send again in",
    workspaceEyebrow: "Generation Studio", workspaceTitle: "Signed-in users should land directly in the real workspace.", workspaceBody: "The main surface now prioritizes prompt composition, generation, preview, and task detail instead of leaving a large auth panel on screen.", runtimeTitle: "Runtime status", runtimeBody: "Auth, system, interaction, and result states are shown separately so the product feels legible at a glance.", notesTitle: "Workspace notes", notesItems: ["The result area now carries more visual weight than explanatory text.", "If the image provider is missing, the page should clearly expose that service issue."],
    resultTitle: "Result preview", resultEmptyTitle: "Waiting for output", resultEmptyBody: "Once a prompt is submitted, the latest image and task state appear here with credit updates.", latest: "Latest output", taskTitle: "Task details", taskId: "Task ID", model: "Model", cost: "Cost", createdAt: "Created", completedAt: "Completed", accountTitle: "Account",
    ctaPrimary: "Generate image", ctaSecondary: "Explore the studio",
    sessionLoadFailed: "Unable to load the current session.", sessionRefreshFailed: "Unable to refresh the current session.", enterEmail: "Enter an email address first.", enterPrompt: "Enter a prompt first.", enterSameEmail: "Enter the same email address that received the code.", enterCode: "Enter the verification code.", sentCode: "Verification code sent to {email}.{expires}{debug}", requestTooFast: "Request too fast. Please wait {time} before trying again.", verifyTooFast: "Verification is temporarily limited. Please wait {time} and try again.", signedInNewNotice: "Account created and studio unlocked.", signedInExistingNotice: "Signed in successfully.", signedOutNotice: "You have been signed out.", loginToContinue: "Sign in to continue. Your current prompt has been preserved.", generateSuccess: "Image generated successfully. {count} asset(s) created.", unexpectedPayload: "Image generation returned an unexpected payload.", imagePreviewUnavailable: "The task succeeded, but this page could not display the returned file path."
  }
};

const timeLeftText = (seconds: number) => seconds <= 0 ? "0s" : seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60 || ""}`.trim();
const formatDate = (value: string | null, locale: Locale) => value ? new Date(value).toLocaleString(locale === "zh" ? "zh-CN" : "en-US") : "-";
const formatTemplate = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
const primaryImageUrl = (task: ImageTaskResult | null) => task?.assets[0]?.fileUrl ?? null;
const noticeClasses = (type: Notice["type"]) => type === "error" ? "border-rose-400/30 bg-rose-400/10 text-rose-100" : type === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100" : "border-sky-400/30 bg-sky-400/10 text-sky-100";

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [prompt, setPrompt] = useState("A cinematic futuristic product scene with glowing edges, reflective glass, and dramatic studio lighting.");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [pendingGenerateAfterLogin, setPendingGenerateAfterLogin] = useState(false);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [authNotice, setAuthNotice] = useState<Notice | null>(null);
  const [generationNotice, setGenerationNotice] = useState<Notice | null>(null);
  const [generationTask, setGenerationTask] = useState<ImageTaskResult | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [previewLoadFailed, setPreviewLoadFailed] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("unknown");

  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const t = copy[locale];
  const authStatus: AuthStatus = isLoadingSession ? "checking" : user ? "signedIn" : "signedOut";
  const interactionStatus: InteractionStatus = isLoadingSession ? "checking" : isGeneratingImage ? "generating" : authStatus === "signedOut" && showLoginPanel ? "authRequired" : "ready";
  const resultStatus: ResultStatus = generationTask ? "success" : generationNotice?.type === "error" ? "error" : "empty";
  const cooldownActive = useMemo(() => cooldownEndsAt !== null && timeLeft > 0, [cooldownEndsAt, timeLeft]);

  useEffect(() => {
    const saved = window.localStorage.getItem("sparkpost-locale");
    if (saved === "zh" || saved === "en") setLocale(saved);
  }, []);

  useEffect(() => { window.localStorage.setItem("sparkpost-locale", locale); }, [locale]);

  useEffect(() => {
    if (authStatus === "signedOut" && showLoginPanel && pendingGenerateAfterLogin) {
      setAuthNotice({ type: "info", text: t.loginToContinue });
    }
  }, [authStatus, pendingGenerateAfterLogin, showLoginPanel, t.loginToContinue]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const response = await fetch("/api/me", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(t.sessionLoadFailed);
        const data = (await response.json()) as MeResponse;
        setUser(data.user);
        if (data.user) setEmail(data.user.email);
      } catch (error) {
        if (!controller.signal.aborted) setAuthNotice({ type: "error", text: error instanceof Error ? error.message : t.sessionLoadFailed });
      } finally {
        if (!controller.signal.aborted) setIsLoadingSession(false);
      }
    }
    void loadSession();
    return () => controller.abort();
  }, [t.sessionLoadFailed]);

  useEffect(() => {
    if (!cooldownEndsAt) { setTimeLeft(0); return undefined; }
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) setCooldownEndsAt(null);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [cooldownEndsAt]);

  useEffect(() => { if (showLoginPanel) window.setTimeout(() => emailRef.current?.focus(), 40); }, [showLoginPanel]);
  useEffect(() => { if (authStatus === "signedIn") promptRef.current?.focus(); }, [authStatus]);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) setShowAccountMenu(false);
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const refreshSession = useCallback(async () => {
    const response = await fetch("/api/me", { cache: "no-store" });
    if (!response.ok) throw new Error(t.sessionRefreshFailed);
    const data = (await response.json()) as MeResponse;
    setUser(data.user);
    if (data.user) setEmail(data.user.email);
  }, [t.sessionRefreshFailed]);

  const generateImage = useCallback(async () => {
    setGenerationNotice(null);
    if (!prompt.trim()) {
      setGenerationNotice({ type: "error", text: t.enterPrompt });
      return;
    }
    setIsGeneratingImage(true);
    setGeneratedImageUrl(null);
    setGenerationTask(null);
    setPreviewLoadFailed(false);
    try {
      const response = await fetch("/api/generate/image", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ prompt }) });
      const data = (await response.json().catch(() => null)) as GenerateImageResponse | null;
      if (!response.ok) {
        const errorText = data && "error" in data && typeof data.error === "string" ? data.error : "Unable to generate image.";
        setGenerationNotice({ type: "error", text: errorText });
        if (response.status === 503) setSystemStatus("unavailable");
        return;
      }
      if (!data || !("ok" in data) || data.ok !== true) {
        setGenerationNotice({ type: "error", text: t.unexpectedPayload });
        return;
      }
      setSystemStatus("available");
      setGenerationTask(data.task);
      setGeneratedImageUrl(primaryImageUrl(data.task));
      setGenerationNotice({ type: "success", text: formatTemplate(t.generateSuccess, { count: data.task.assets.length }) });
      setUser((current) => current ? { ...current, creditBalance: data.task.remainingCredits } : current);
      if (!primaryImageUrl(data.task)) setGenerationNotice({ type: "info", text: t.imagePreviewUnavailable });
    } catch (error) {
      setGenerationNotice({ type: "error", text: error instanceof Error ? error.message : "Unable to generate image." });
    } finally {
      setIsGeneratingImage(false);
    }
  }, [prompt, t.enterPrompt, t.generateSuccess, t.imagePreviewUnavailable, t.unexpectedPayload]);

  useEffect(() => {
    if (user && pendingGenerateAfterLogin && !isGeneratingImage) {
      setPendingGenerateAfterLogin(false);
      void generateImage();
    }
  }, [generateImage, isGeneratingImage, pendingGenerateAfterLogin, user]);

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthNotice(null);
    if (!email.trim()) { setAuthNotice({ type: "error", text: t.enterEmail }); return; }
    setIsSendingCode(true);
    try {
      const response = await fetch("/api/auth/send-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        if (response.status === 429) {
          const retry = Math.max(1, Number(data?.retryAfterSeconds) || 60);
          setCooldownEndsAt(Date.now() + retry * 1000);
          setAuthNotice({ type: "error", text: formatTemplate(t.requestTooFast, { time: timeLeftText(retry) }) });
          return;
        }
        throw new Error(typeof data?.error === "string" ? data.error : "Unable to send verification code.");
      }
      const expiresAt = typeof data?.expiresAt === "string" ? data.expiresAt : null;
      const debugCode = typeof data?.debugCode === "string" ? data.debugCode : null;
      setCode(debugCode ?? "");
      setAuthNotice({ type: "success", text: formatTemplate(t.sentCode, { email, expires: expiresAt ? ` ${new Date(expiresAt).toLocaleTimeString()}.` : "", debug: debugCode ? ` Debug code: ${debugCode}.` : "" }) });
      codeRef.current?.focus();
    } catch (error) {
      setAuthNotice({ type: "error", text: error instanceof Error ? error.message : "Unable to send verification code." });
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleVerifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthNotice(null);
    if (!email.trim()) { setAuthNotice({ type: "error", text: t.enterSameEmail }); return; }
    if (!code.trim()) { setAuthNotice({ type: "error", text: t.enterCode }); return; }
    setIsVerifyingCode(true);
    try {
      const response = await fetch("/api/auth/verify-code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) {
        if (response.status === 429) {
          const retry = Math.max(1, Number(data?.retryAfterSeconds) || 60);
          setCooldownEndsAt(Date.now() + retry * 1000);
          setAuthNotice({ type: "error", text: formatTemplate(t.verifyTooFast, { time: timeLeftText(retry) }) });
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
        setShowLoginPanel(false);
        setAuthNotice({ type: "success", text: data?.isNewUser === true ? t.signedInNewNotice : t.signedInExistingNotice });
      } else {
        await refreshSession();
      }
    } catch (error) {
      setAuthNotice({ type: "error", text: error instanceof Error ? error.message : "Unable to verify code." });
    } finally {
      setIsVerifyingCode(false);
    }
  }

  async function handleLogout() {
    setAuthNotice(null);
    setGenerationNotice(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Unable to log out.");
      setUser(null);
      setCode("");
      setShowAccountMenu(false);
      setShowLoginPanel(false);
      setPendingGenerateAfterLogin(false);
      setGenerationTask(null);
      setGeneratedImageUrl(null);
      setPreviewLoadFailed(false);
      setAuthNotice({ type: "info", text: t.signedOutNotice });
    } catch (error) {
      setAuthNotice({ type: "error", text: error instanceof Error ? error.message : "Unable to log out." });
    }
  }

  function requireLoginToGenerate() {
    setShowLoginPanel(true);
    setPendingGenerateAfterLogin(true);
    setAuthNotice({ type: "info", text: t.loginToContinue });
  }

  const canGenerate = !!prompt.trim() && !isGeneratingImage;
  const statusCards = [
    { label: locale === "zh" ? "认证" : "Auth", value: authStatus === "checking" ? t.checking : authStatus === "signedIn" ? t.signedIn : t.signedOut },
    { label: locale === "zh" ? "服务" : "Provider", value: systemStatus === "available" ? t.providerAvailable : systemStatus === "unavailable" ? t.providerUnavailable : t.providerUnknown },
    { label: locale === "zh" ? "交互" : "Interaction", value: interactionStatus === "generating" ? t.generating : interactionStatus === "authRequired" ? t.authRequired : interactionStatus === "checking" ? t.checking : t.ready },
    { label: locale === "zh" ? "结果" : "Result", value: resultStatus === "empty" ? t.resultEmpty : resultStatus === "success" ? t.resultSuccess : t.resultError },
  ];
  const accountInitials = user?.email.slice(0, 2).toUpperCase() ?? "SP";

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(33,211,255,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.03),_transparent_32%)]" />
      <div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_center,_rgba(15,118,110,0.18),_transparent_38%)]" />
      <div className="absolute left-6 top-32 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute right-0 top-0 h-[32rem] w-[32rem] rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="mb-6 flex items-center justify-between gap-4 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-500 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(56,189,248,0.35)]">SP</div>
            <div>
              <div className="text-sm font-semibold tracking-[0.22em] text-cyan-200/90">{t.badge}</div>
              <div className="text-xs text-slate-400">{t.tagline}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-sm text-slate-300">
              {(["zh", "en"] as Locale[]).map((value) => (
                <button key={value} type="button" onClick={() => setLocale(value)} className={`rounded-full px-3 py-1.5 transition ${locale === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-400 hover:text-white"}`}>{value === "zh" ? "中文" : "EN"}</button>
              ))}
            </div>
            {user ? (
              <div className="relative" ref={menuRef}>
                <button type="button" onClick={() => setShowAccountMenu((current) => !current)} className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-left transition duration-200 hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300/80 to-indigo-400/90 text-sm font-semibold text-slate-950">{accountInitials}</div>
                  <div className="hidden sm:block"><div className="text-sm font-medium text-white">{user.email}</div><div className="text-xs text-slate-400">{t.credits}: {user.creditBalance}</div></div>
                </button>
                {showAccountMenu ? <div className="absolute right-0 top-[calc(100%+12px)] z-20 w-72 rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"><div className="mb-4 border-b border-white/10 pb-4"><div className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">{t.accountTitle}</div><div className="mt-3 text-sm text-white">{user.email}</div><div className="mt-1 text-sm text-slate-400">{t.credits}: {user.creditBalance}</div></div><button type="button" onClick={() => void handleLogout()} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-rose-300/40 hover:bg-rose-400/10">{t.signOut}</button></div> : null}
              </div>
            ) : <button type="button" onClick={() => setShowLoginPanel(true)} className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-2.5 text-sm font-medium text-cyan-50 transition hover:border-cyan-200/60 hover:bg-cyan-300/15">{t.signIn}</button>}
          </div>
        </header>

        {!user ? (
          <div className="grid flex-1 gap-8 xl:grid-cols-[1.12fr_0.88fr]">
            <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.04] px-6 py-8 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:px-8 lg:px-10 lg:py-10">
              <div className="absolute right-8 top-8 hidden h-24 w-24 rounded-full border border-cyan-300/15 bg-cyan-300/10 blur-2xl lg:block" />
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100/80">{t.heroEyebrow}</div>
                <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">{t.landingTitle}</h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">{t.landingBody}</p>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-100/70">{t.landingHint}</p>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-5 rounded-[32px] border border-white/10 bg-slate-950/70 p-5 shadow-inner shadow-black/30 sm:p-6">
                  <label htmlFor="landing-prompt" className="block text-sm font-medium text-slate-200">{t.promptLabel}</label>
                  <textarea id="landing-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={6} className="w-full rounded-[26px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:bg-white/[0.06]" placeholder={t.landingPromptPlaceholder} />
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-400">{t.keepPrompt}</div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button type="button" onClick={() => setShowLoginPanel(true)} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10">{t.ctaSecondary}</button>
                      <button type="button" onClick={requireLoginToGenerate} className="rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-6 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_30px_rgba(34,211,238,0.35)]">{t.ctaPrimary}</button>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(140deg,rgba(9,18,35,0.92),rgba(2,6,23,0.86))] p-5 sm:p-6">
                  <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/75">{t.latest}</div>
                  <div className="mt-4 aspect-[4/3] rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_22%_22%,_rgba(34,211,238,0.42),_transparent_28%),radial-gradient(circle_at_78%_24%,_rgba(129,140,248,0.32),_transparent_26%),linear-gradient(140deg,_rgba(2,132,199,0.20),_rgba(15,23,42,0.96)_58%,_rgba(8,47,73,0.82))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]" />
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4"><div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{locale === "zh" ? "信号" : "Signal"}</div><div className="mt-2 text-sm text-slate-200">{t.previewBody}</div></div>
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4"><div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{locale === "zh" ? "状态" : "State"}</div><div className="mt-2 text-sm text-slate-200">{t.loginToContinue}</div></div>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {t.previewCards.map(([eyebrow, title, body], index) => (
                  <article key={title} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25 hover:bg-white/[0.05]">
                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-200/75">{eyebrow}</div>
                    <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
                    <div className={`mt-5 h-28 rounded-[24px] border border-white/10 bg-gradient-to-br ${index === 0 ? "from-cyan-300/20 via-sky-500/10 to-transparent" : index === 1 ? "from-indigo-400/20 via-fuchsia-500/10 to-transparent" : "from-emerald-300/15 via-cyan-500/10 to-transparent"}`} />
                  </article>
                ))}
              </div>

              <div className="mt-8 rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
                <div className="text-sm font-medium text-white">{t.pathTitle}</div>
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-slate-300 md:grid-cols-3">
                  {t.pathItems.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" /><span>{item}</span></li>)}
                </ul>
              </div>
            </section>

            <aside className="flex flex-col gap-6">
              <section className="rounded-[32px] border border-white/10 bg-slate-950/75 p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div><div className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">{t.accountTitle}</div><h2 className="mt-2 text-2xl font-semibold text-white">{t.authTitle}</h2></div>
                  {showLoginPanel ? <button type="button" onClick={() => setShowLoginPanel(false)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10">{t.close}</button> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{t.authBody}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
                  {statusCards.map((item) => <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3"><div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</div><div className="mt-2 text-sm font-medium text-white">{item.value}</div></div>)}
                </div>
                {authNotice ? <div className={`mt-5 rounded-[22px] border px-4 py-3 text-sm ${noticeClasses(authNotice.type)}`}>{authNotice.text}</div> : null}
                {showLoginPanel ? (
                  <div className="mt-5 space-y-4 rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                    <form className="space-y-4" onSubmit={(event) => void handleSendCode(event)}>
                      <div><label htmlFor="auth-email" className="mb-2 block text-sm font-medium text-slate-200">{t.email}</label><input ref={emailRef} id="auth-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-[18px] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50" placeholder="you@example.com" /></div>
                      <button type="submit" disabled={isSendingCode || cooldownActive} className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-300/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">{isSendingCode ? t.sendingCode : cooldownActive ? `${t.cooldown} ${timeLeftText(timeLeft)}` : t.sendCode}</button>
                    </form>
                    <form className="space-y-4" onSubmit={(event) => void handleVerifyCode(event)}>
                      <div><label htmlFor="auth-code" className="mb-2 block text-sm font-medium text-slate-200">{t.code}</label><input ref={codeRef} id="auth-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className="w-full rounded-[18px] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50" placeholder="123456" /></div>
                      <button type="submit" disabled={isVerifyingCode} className="w-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{isVerifyingCode ? t.verifying : t.verify}</button>
                    </form>
                    <p className="text-xs leading-5 text-slate-500">{t.authHint}</p>
                  </div>
                ) : <button type="button" onClick={() => setShowLoginPanel(true)} className="mt-5 w-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-4 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:-translate-y-0.5">{t.signIn}</button>}
              </section>
            </aside>
          </div>
        ) : (
          <div className="grid flex-1 gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <section className="flex flex-col gap-6 rounded-[40px] border border-white/10 bg-white/[0.04] px-6 py-8 shadow-[0_24px_90px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:px-8 lg:px-10 lg:py-10">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">{t.workspaceEyebrow}</div>
                <h1 className="mt-4 text-4xl font-semibold leading-tight text-white sm:text-5xl">{t.workspaceTitle}</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">{t.workspaceBody}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {statusCards.map((item, index) => <div key={item.label} className={`rounded-[26px] border border-white/10 px-5 py-4 transition ${index === 1 && systemStatus === "unavailable" ? "bg-rose-400/10" : "bg-white/[0.04]"}`}><div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</div><div className="mt-2 text-base font-medium text-white">{item.value}</div></div>)}
              </div>

              <div className="rounded-[34px] border border-white/10 bg-slate-950/70 p-5 sm:p-6">
                <label htmlFor="workspace-prompt" className="mb-3 block text-sm font-medium text-slate-200">{t.promptLabel}</label>
                <textarea ref={promptRef} id="workspace-prompt" rows={6} value={prompt} onChange={(event) => setPrompt(event.target.value)} className="w-full rounded-[26px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:bg-white/[0.06]" placeholder={t.workspacePromptPlaceholder} />
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-2xl text-sm leading-6 text-slate-400">{t.workspacePromptHint}</p>
                  <button type="button" onClick={() => void generateImage()} disabled={!canGenerate} className="rounded-full bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-500 px-6 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(34,211,238,0.35)] disabled:cursor-not-allowed disabled:opacity-60">{isGeneratingImage ? t.generating : t.generate}</button>
                </div>
              </div>

              {authNotice ? <div className={`rounded-[24px] border px-4 py-3 text-sm ${noticeClasses(authNotice.type)}`}>{authNotice.text}</div> : null}
              {generationNotice ? <div className={`rounded-[24px] border px-4 py-3 text-sm ${noticeClasses(generationNotice.type)}`}>{generationNotice.text}</div> : null}

              <div className="grid gap-6 lg:grid-cols-[1.12fr_0.88fr]">
                <section className="rounded-[34px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-4"><div><div className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">{t.latest}</div><h2 className="mt-2 text-2xl font-semibold text-white">{t.resultTitle}</h2></div>{generationTask ? <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-slate-300">{generationTask.status}</div> : null}</div>
                  <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80">
                    <div className="aspect-[4/3] w-full">
                      {generatedImageUrl && !previewLoadFailed ? <div className="relative h-full w-full"><Image src={generatedImageUrl} alt="Generated preview" fill unoptimized className="object-cover" onError={() => setPreviewLoadFailed(true)} /></div> : <div className="flex h-full flex-col justify-between bg-[radial-gradient(circle_at_20%_20%,_rgba(34,211,238,0.28),_transparent_30%),radial-gradient(circle_at_75%_25%,_rgba(129,140,248,0.22),_transparent_26%),linear-gradient(135deg,_rgba(6,182,212,0.1),_rgba(15,23,42,0.95)_55%,_rgba(8,47,73,0.8))] p-6"><div className="inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{resultStatus === "empty" ? t.resultEmpty : resultStatus === "error" ? t.resultError : t.resultSuccess}</div><div><h3 className="text-2xl font-semibold text-white">{t.resultEmptyTitle}</h3><p className="mt-3 max-w-md text-sm leading-6 text-slate-300">{previewLoadFailed ? t.imagePreviewUnavailable : t.resultEmptyBody}</p></div></div>}
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="text-sm font-medium text-white">{t.taskTitle}</div>
                    <div className="mt-4 grid gap-4 text-sm text-slate-300">
                      <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t.taskId}</div><div className="mt-2 break-all text-white">{generationTask?.id ?? "-"}</div></div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t.model}</div><div className="mt-2 text-white">{generationTask?.model ?? "-"}</div></div>
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t.cost}</div><div className="mt-2 text-white">{generationTask ? generationTask.costCredits : "-"}</div></div>
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t.createdAt}</div><div className="mt-2 text-white">{formatDate(generationTask?.createdAt ?? null, locale)}</div></div>
                        <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3"><div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{t.completedAt}</div><div className="mt-2 text-white">{formatDate(generationTask?.completedAt ?? null, locale)}</div></div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5"><div className="text-sm font-medium text-white">{t.runtimeTitle}</div><p className="mt-2 text-sm leading-6 text-slate-400">{t.runtimeBody}</p></div>
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5"><div className="text-sm font-medium text-white">{t.notesTitle}</div><ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">{t.notesItems.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-2 w-2 rounded-full bg-cyan-300" /><span>{item}</span></li>)}</ul></div>
                </section>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

