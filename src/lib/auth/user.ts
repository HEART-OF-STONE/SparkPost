import { verifySessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function getAuthenticatedUser(sessionToken: string | undefined) {
  const session = verifySessionToken(sessionToken);
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId,
    },
    include: {
      creditAccount: true,
    },
  });

  if (!user || user.email !== session.email) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
    emailVerifiedAt: user.emailVerifiedAt,
    lastLoginAt: user.lastLoginAt,
    creditBalance: user.creditAccount?.balance ?? 0,
  };
}
