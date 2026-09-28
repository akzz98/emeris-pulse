const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type RedeemResult = {
  result: "Granted";
};

export async function redeemPass(token: string): Promise<RedeemResult> {
  const response = await fetch(`${apiUrl}/access/redeem`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const body = (await response.json()) as RedeemResult & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(body.error?.message ?? "The scan could not be recorded.");
  }
  return body;
}
