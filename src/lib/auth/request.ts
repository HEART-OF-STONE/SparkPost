export async function readJsonBody(request: Request) {
  try {
    return {
      ok: true as const,
      body: (await request.json()) as unknown,
    };
  } catch {
    return {
      ok: false as const,
      error: "Request body must be valid JSON.",
    };
  }
}
