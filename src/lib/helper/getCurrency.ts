export default function getCurrencies(
  currencies: Record<string, { name?: string; symbol?: string }> | undefined,
): { name: string; symbol: string }[] {
  if (!currencies || Object.keys(currencies).length === 0)
    return [{ name: "N/A", symbol: "" }];
  return Object.values(currencies).map((c) => ({
    name: c.name || "Unknown",
    symbol: c.symbol || "",
  }));
}
