import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { imageConfig, isImageBackendConfigured } from "@/lib/image/config";

export class ImageGenerationConfigError extends Error {}
export class ImageGenerationAuthError extends Error {}
export class ImageGenerationCreditsError extends Error {}
export class ImageGenerationProviderError extends Error {}

function normalizePrompt(prompt: string) {
  return prompt.trim();
}

export function validateTextToImageInput(input: unknown) {
  const prompt =
    typeof input === "object" && input !== null && !Array.isArray(input) && "prompt" in input
      ? input.prompt
      : undefined;

  if (typeof prompt !== "string") {
    return { ok: false as const, error: "Prompt is required." };
  }

  const normalizedPrompt = normalizePrompt(prompt);
  if (normalizedPrompt.length < 3) {
    return { ok: false as const, error: "Prompt must be at least 3 characters." };
  }

  if (normalizedPrompt.length > 2000) {
    return { ok: false as const, error: "Prompt must be 2000 characters or fewer." };
  }

  return { ok: true as const, prompt: normalizedPrompt };
}

type ProviderResult = {
  buffer: Buffer;
  mimeType: string;
  model: string;
};

function getImageGenerationEndpoint() {
  if (imageConfig.baseUrl.endsWith("/images/generations")) {
    return imageConfig.baseUrl;
  }

  return `${imageConfig.baseUrl}/images/generations`;
}

async function fetchRemoteImageBuffer(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new ImageGenerationProviderError("Image provider returned an unreadable image URL.");
  }

  const mimeType = response.headers.get("content-type") || "image/png";
  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType,
  };
}

async function callOfficialImageProvider(prompt: string): Promise<ProviderResult> {
  if (!isImageBackendConfigured()) {
    throw new ImageGenerationConfigError(
      "Image generation provider is not configured.",
    );
  }

  const response = await fetch(getImageGenerationEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${imageConfig.apiKey}`,
    },
    body: JSON.stringify({
      model: imageConfig.model,
      prompt,
    }),
  });

  const body = (await response.json().catch(() => null)) as
    | {
        error?: { message?: string };
        data?: Array<{ b64_json?: string; url?: string }>;
      }
    | null;

  if (!response.ok) {
    throw new ImageGenerationProviderError(
      body?.error?.message || "Image provider request failed.",
    );
  }

  const imageData = body?.data?.[0];
  if (imageData?.b64_json) {
    return {
      buffer: Buffer.from(imageData.b64_json, "base64"),
      mimeType: "image/png",
      model: imageConfig.model,
    };
  }

  if (imageData?.url) {
    const remoteImage = await fetchRemoteImageBuffer(imageData.url);
    return {
      buffer: remoteImage.buffer,
      mimeType: remoteImage.mimeType,
      model: imageConfig.model,
    };
  }

  throw new ImageGenerationProviderError("Image provider returned no image data.");
}

async function generateImageBuffer(prompt: string) {
  if (["official", "relay"].includes(imageConfig.backend)) {
    return callOfficialImageProvider(prompt);
  }

  throw new ImageGenerationConfigError(
    `Unsupported IMAGE_BACKEND: ${imageConfig.backend}`,
  );
}

async function persistGeneratedAsset(taskId: string, imageBuffer: Buffer) {
  const filename = `${taskId}-${randomUUID()}.png`;
  const uploadDirectory = path.resolve(process.cwd(), imageConfig.uploadDir, "generated");
  await mkdir(uploadDirectory, { recursive: true });

  const absoluteFilePath = path.join(uploadDirectory, filename);
  await writeFile(absoluteFilePath, imageBuffer);

  return {
    fileUrl: `/uploads/generated/${filename}`,
    width: null,
    height: null,
  };
}

export async function generateTextToImageForUser(userId: string, prompt: string) {
  const creditAccount = await prisma.creditAccount.findUnique({
    where: { userId },
  });

  if (!creditAccount) {
    throw new ImageGenerationAuthError("Authenticated user has no credit account.");
  }

  if (creditAccount.balance < imageConfig.textToImageCost) {
    throw new ImageGenerationCreditsError("Not enough credits to generate an image.");
  }

  const task = await prisma.generationTask.create({
    data: {
      userId,
      taskType: "text_to_image",
      status: "running",
      prompt,
      model: imageConfig.model,
      costCredits: imageConfig.textToImageCost,
    },
  });

  try {
    const providerResult = await generateImageBuffer(prompt);
    const assetDraft = await persistGeneratedAsset(task.id, providerResult.buffer);
    const completedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updatedCreditAccount = await tx.creditAccount.update({
        where: { userId },
        data: {
          balance: {
            decrement: imageConfig.textToImageCost,
          },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          type: "text_to_image",
          amount: -imageConfig.textToImageCost,
          balanceAfter: updatedCreditAccount.balance,
          relatedTaskId: task.id,
          remark: prompt.slice(0, 120),
        },
      });

      const asset = await tx.generatedAsset.create({
        data: {
          taskId: task.id,
          assetType: "image",
          fileUrl: assetDraft.fileUrl,
          width: assetDraft.width,
          height: assetDraft.height,
        },
      });

      const updatedTask = await tx.generationTask.update({
        where: { id: task.id },
        data: {
          status: "succeeded",
          model: providerResult.model,
          completedAt,
        },
      });

      return {
        task: updatedTask,
        asset,
        creditBalance: updatedCreditAccount.balance,
      };
    });

    return {
      id: result.task.id,
      status: result.task.status,
      prompt: result.task.prompt,
      createdAt: result.task.createdAt,
      completedAt: result.task.completedAt,
      model: result.task.model,
      costCredits: result.task.costCredits,
      remainingCredits: result.creditBalance,
      assets: [
        {
          id: result.asset.id,
          fileUrl: result.asset.fileUrl,
          width: result.asset.width,
          height: result.asset.height,
        },
      ],
    };
  } catch (error) {
    await prisma.generationTask.update({
      where: { id: task.id },
      data: {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Image generation failed.",
      },
    });

    throw error;
  }
}

