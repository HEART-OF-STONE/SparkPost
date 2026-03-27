import { createHash, randomInt } from "node:crypto";

import { authConfig, getSessionSecret, shouldExposeDebugCode } from "@/lib/auth/config";
import { isValidEmail, normalizeEmail } from "@/lib/auth/email";
import { prisma } from "@/lib/prisma";

function hashVerificationCode(email: string, code: string) {
  return createHash("sha256")
    .update(`${normalizeEmail(email)}:${code}:${getSessionSecret()}`)
    .digest("hex");
}

function generateVerificationCode() {
  const min = 10 ** (authConfig.codeLength - 1);
  const max = 10 ** authConfig.codeLength;

  return String(randomInt(min, max));
}

export function validateSendCodeInput(input: unknown) {
  const email = typeof input === "object" && input && "email" in input ? input.email : undefined;

  if (typeof email !== "string") {
    return { ok: false as const, error: "Email is required." };
  }

  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    return { ok: false as const, error: "Invalid email address." };
  }

  return { ok: true as const, email: normalizedEmail };
}

export function validateVerifyCodeInput(input: unknown) {
  const email = typeof input === "object" && input && "email" in input ? input.email : undefined;
  const code = typeof input === "object" && input && "code" in input ? input.code : undefined;

  if (typeof email !== "string" || typeof code !== "string") {
    return { ok: false as const, error: "Email and code are required." };
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.trim();

  if (!isValidEmail(normalizedEmail)) {
    return { ok: false as const, error: "Invalid email address." };
  }

  if (!/^\d{6}$/.test(normalizedCode)) {
    return { ok: false as const, error: "Verification code must be 6 digits." };
  }

  return { ok: true as const, email: normalizedEmail, code: normalizedCode };
}

export async function issueVerificationCode(email: string) {
  const now = new Date();
  const latestCode = await prisma.emailVerificationCode.findFirst({
    where: {
      email,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
    },
  });

  if (latestCode) {
    const millisecondsSinceLastCode = now.getTime() - latestCode.createdAt.getTime();
    const cooldownMilliseconds = authConfig.codeCooldownSeconds * 1000;

    if (millisecondsSinceLastCode < cooldownMilliseconds) {
      return {
        ok: false as const,
        reason: "cooldown",
        retryAfterSeconds: Math.ceil(
          (cooldownMilliseconds - millisecondsSinceLastCode) / 1000,
        ),
      };
    }
  }

  const code = generateVerificationCode();
  const expiresAt = new Date(now.getTime() + authConfig.codeTtlMinutes * 60 * 1000);

  await prisma.emailVerificationCode.create({
    data: {
      email,
      codeHash: hashVerificationCode(email, code),
      expiresAt,
    },
  });

  return {
    ok: true as const,
    expiresAt,
    ...(shouldExposeDebugCode() ? { debugCode: code } : {}),
  };
}

export async function verifyCodeAndProvisionUser(email: string, code: string) {
  const now = new Date();
  const codeHash = hashVerificationCode(email, code);
  const verificationCode = await prisma.emailVerificationCode.findFirst({
    where: {
      email,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!verificationCode) {
    return { ok: false as const, reason: "invalid" };
  }

  if (verificationCode.usedAt) {
    return { ok: false as const, reason: "used" };
  }

  if (verificationCode.expiresAt <= now) {
    return { ok: false as const, reason: "expired" };
  }

  if (verificationCode.lockedUntil && verificationCode.lockedUntil > now) {
    return {
      ok: false as const,
      reason: "locked",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((verificationCode.lockedUntil.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  if (verificationCode.codeHash !== codeHash) {
    return prisma.$transaction(async (tx) => {
      const currentCode = await tx.emailVerificationCode.findUnique({
        where: {
          id: verificationCode.id,
        },
      });

      if (!currentCode) {
        return { ok: false as const, reason: "invalid" };
      }

      const currentNow = new Date();
      if (currentCode.usedAt) {
        return { ok: false as const, reason: "used" };
      }

      if (currentCode.expiresAt <= currentNow) {
        return { ok: false as const, reason: "expired" };
      }

      if (currentCode.lockedUntil && currentCode.lockedUntil > currentNow) {
        return {
          ok: false as const,
          reason: "locked",
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((currentCode.lockedUntil.getTime() - currentNow.getTime()) / 1000),
          ),
        };
      }

      const nextAttemptCount = currentCode.attemptCount + 1;
      const shouldLockCode = nextAttemptCount >= authConfig.verifyCodeMaxAttempts;
      const lockedUntil = shouldLockCode
        ? new Date(currentNow.getTime() + authConfig.verifyCodeLockoutSeconds * 1000)
        : null;

      await tx.emailVerificationCode.update({
        where: { id: currentCode.id },
        data: {
          attemptCount: nextAttemptCount,
          lockedUntil,
        },
      });

      if (shouldLockCode) {
        return {
          ok: false as const,
          reason: "locked",
          retryAfterSeconds: authConfig.verifyCodeLockoutSeconds,
        };
      }

      return { ok: false as const, reason: "invalid" };
    });
  }

  return prisma.$transaction(async (tx) => {
    const timestamp = new Date();
    const markUsedResult = await tx.emailVerificationCode.updateMany({
      where: {
        id: verificationCode.id,
        usedAt: null,
        OR: [{ lockedUntil: null }, { lockedUntil: { lte: timestamp } }],
      },
      data: {
        usedAt: timestamp,
      },
    });

    if (markUsedResult.count !== 1) {
      const latestCodeState = await tx.emailVerificationCode.findUnique({
        where: { id: verificationCode.id },
      });

      if (!latestCodeState) {
        return { ok: false as const, reason: "invalid" };
      }

      if (latestCodeState.usedAt) {
        return { ok: false as const, reason: "used" };
      }

      if (latestCodeState.expiresAt <= timestamp) {
        return { ok: false as const, reason: "expired" };
      }

      if (latestCodeState.lockedUntil && latestCodeState.lockedUntil > timestamp) {
        return {
          ok: false as const,
          reason: "locked",
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((latestCodeState.lockedUntil.getTime() - timestamp.getTime()) / 1000),
          ),
        };
      }

      return { ok: false as const, reason: "invalid" };
    }

    let user = await tx.user.findUnique({
      where: { email },
      include: { creditAccount: true },
    });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await tx.user.create({
        data: {
          email,
          emailVerifiedAt: timestamp,
          lastLoginAt: timestamp,
        },
        include: { creditAccount: true },
      });
    } else {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: user.emailVerifiedAt ?? timestamp,
          lastLoginAt: timestamp,
        },
        include: { creditAccount: true },
      });
    }

    const creditAccount = await tx.creditAccount.upsert({
      where: {
        userId: user.id,
      },
      update: {},
      create: {
        userId: user.id,
        balance: isNewUser ? authConfig.signupBonusCredits : 0,
      },
    });

    await tx.emailVerificationCode.update({
      where: { id: verificationCode.id },
      data: {
        usedByUserId: user.id,
      },
    });

    return {
      ok: true as const,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        emailVerifiedAt: user.emailVerifiedAt,
        lastLoginAt: user.lastLoginAt,
        creditBalance: creditAccount.balance,
      },
      isNewUser,
    };
  });
}
