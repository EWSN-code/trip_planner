export const uid = (p = "id") =>
  `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
export const now = () => new Date().toISOString();
export const clone = (o) => JSON.parse(JSON.stringify(o));
export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
export const yen = (n) => `¥${Number(n || 0).toLocaleString("ja-JP")}`;
export const amount = (e) =>
  typeof e.total === "number"
    ? e.total
    : Number(e.unitPrice || 0) * Number(e.qty || 0);
export const payments = {
  prepaid: "事前支払",
  cash: "現金",
  ic: "交通系IC",
  card: "カード",
  other: "その他",
};
export const categories = {
  transport: "交通",
  food: "食事",
  activity: "観光",
  hotel: "宿泊",
  shopping: "買い物",
  ticket: "チケット",
  other: "その他",
};
export function total(t) {
  return (t.timeline || [])
    .flatMap((i) => i.expenses || [])
    .reduce((s, e) => s + amount(e), 0);
}
export function summarize(t) {
  const payment = {},
    category = {};
  for (const i of t.timeline || [])
    for (const e of i.expenses || []) {
      const a = amount(e),
        p = e.payment || "other",
        c =
          e.category ||
          {
            transport: "transport",
            food: "food",
            hotel: "hotel",
            activity: "activity",
          }[i.type] ||
          "other";
      payment[p] = (payment[p] || 0) + a;
      category[c] = (category[c] || 0) + a;
    }
  return { payment, category };
}
export const mapUrl = (q) =>
  q
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
    : "";
export const routeUrl = (a, b, m = "transit") =>
  a && b
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(a)}&destination=${encodeURIComponent(b)}&travelmode=${m}`
    : "";
export function formatDayHeader(trip, day) {
  const name = trip?.name || "無題の旅行";
  return `${name} - ${day}日目`;
}
export function pairByDay(tripA, tripB) {
  const daysA = new Set((tripA?.timeline || []).map((i) => Number(i.day || 1)));
  const daysB = new Set((tripB?.timeline || []).map((i) => Number(i.day || 1)));
  const days = [...new Set([...daysA, ...daysB])].sort((a, b) => a - b);
  return days.map((d) => ({
    day: d,
    itemsA: (tripA?.timeline || []).filter((i) => Number(i.day || 1) === d),
    itemsB: (tripB?.timeline || []).filter((i) => Number(i.day || 1) === d),
  }));
}
