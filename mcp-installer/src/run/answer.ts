/** An empty answer accepts; only an explicit negative declines. */
export function answeredNo(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();
  return normalized === "n" || normalized === "no";
}
