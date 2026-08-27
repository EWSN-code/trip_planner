import {
  esc,
  yen,
  amount,
  mapUrl,
  routeUrl,
  total,
  summarize,
  payments,
  categories,
} from "./utils.js";
const notes = (i) =>
  i.notes?.length
    ? `<div class="notes">${i.notes.map((x) => `・${esc(x)}`).join("<br>")}</div>`
    : "";
const costs = (i) =>
  i.expenses?.length
    ? `<div class="meta"><span class="pill cost">${yen(i.expenses.reduce((s, e) => s + amount(e), 0))}</span></div>`
    : "";
const reserve = (i) =>
  i.reservation?.required
    ? `<div class="meta"><span class="pill reservation">予約: ${{ not_open: "受付開始前", available: "未予約", reserved: "予約済み", cancelled: "取消済み", unavailable: "予約不可" }[i.reservation.status] || "未設定"}${i.reservation.openAt ? ` / ${esc(i.reservation.openAt)}` : ""}</span></div>`
    : "";
function resources(i) {
  const a = [],
    q = i.location?.query || i.place || i.name;
  if (q)
    a.push(
      `<a href="${esc(mapUrl(q))}" target="_blank" rel="noopener">地図</a>`,
    );
  if (i.from && i.to)
    a.push(
      `<a href="${esc(routeUrl(i.from, i.to, i.mode === "walk" ? "walking" : "transit"))}" target="_blank" rel="noopener">経路</a>`,
    );
  if (i.stationMapUrl)
    a.push(
      `<a href="${esc(i.stationMapUrl)}" target="_blank" rel="noopener">構内図</a>`,
    );
  if (i.reservation?.url)
    a.push(
      `<a href="${esc(i.reservation.url)}" target="_blank" rel="noopener">予約ページ</a>`,
    );
  return a.length ? `<div class="resources">${a.join("")}</div>` : "";
}
export function render(i) {
  if (i.type === "station") {
    const k = (i.tags || []).find((t) => ["発", "着"].includes(t.text));
    return `<div class="row"><div class="time">${esc(i.time)}</div><div><div class="station-line"><span class="station-name">${esc(i.name)}</span>${k ? `<span class="pill">${esc(k.text)}</span>` : ""}${i.point ? `<span class="pill point">${esc(i.point)}</span>` : ""}</div>${notes(i)}${resources(i)}</div></div>`;
  }
  if (i.type === "transfer") {
    return `<div class="row"><div class="time">${esc(i.arrivalTime)}</div><div><div class="station-line"><span class="station-name">${esc(i.arrivalStation || i.station)}</span><span class="pill">着</span>${i.arrivalPoint ? `<span class="pill point">${esc(i.arrivalPoint)}</span>` : ""}</div>${notes(i)}${resources(i)}</div></div><div class="row"><div class="time">${esc(i.departureTime)}</div><div class="station-line"><span class="station-name">${esc(i.departureStation || i.station)}</span><span class="pill">発</span>${i.departurePoint ? `<span class="pill point">${esc(i.departurePoint)}</span>` : ""}</div></div>`;
  }
  if (i.type === "transport") {
    return `<div class="transport"><strong>${i.mode === "bus" ? "🚌" : i.mode === "walk" ? "🚶" : "🚆"} ${esc(i.line)} ${i.destination ? `<span class="pill">${esc(i.destination)}行</span>` : ""}</strong>${(i.tags || []).length ? `<div class="meta">${i.tags.map((t) => `<span class="pill">${esc(t.text)}</span>`).join(" ")}</div>` : ""}${costs(i)}${reserve(i)}${notes(i)}${resources(i)}</div>`;
  }
  const icon = i.type === "food" ? "🍽️" : i.type === "hotel" ? "🏨" : "📍";
  return `<div class="row"><div class="time">${esc(i.time)}</div><div><div class="item-title">${icon} ${esc(i.name)}</div>${i.place ? `<div class="meta">${esc(i.place)}</div>` : ""}${costs(i)}${reserve(i)}${notes(i)}${resources(i)}</div></div>`;
}
function sumsMap(map, dict) {
  return Object.entries(dict)
    .map(([k, v]) => {
      const n = map[k] || 0;
      return `<div class="sum-row"><span>${esc(v)}</span><strong>${yen(n)}</strong></div>`;
    })
    .join("");
}
export function renderCompareSummary(tripA, tripB) {
  const a = tripA || { name: "", timeline: [] },
    b = tripB || { name: "", timeline: [] };
  const dateA = [a.startDate, a.endDate].filter(Boolean).join(" 〜 ");
  const dateB = [b.startDate, b.endDate].filter(Boolean).join(" 〜 ");
  const col = ({ trip, date, items, sumTotal, sm }) => {
    const days = new Set((trip.timeline || []).map((i) => Number(i.day || 1)));
    return `<section class="card compare-col"><h3>${esc(trip.name || "無題の旅行")}</h3><p class="muted">${esc(date) || "(日付未設定)"}</p><div class="top-summary"><div><span>予定合計</span><strong>${yen(sumTotal)}</strong></div><div><span>項目数</span><strong>${items}</strong></div><div><span>日数</span><strong>${days.size || 0}</strong></div></div><div class="budget-grid"><section><h3>支払方法別</h3>${sumsMap(sm.payment, payments)}</section><section><h3>科目別</h3>${sumsMap(sm.category, categories)}</section></div></section>`;
  };
  return `<div class="compare-grid">${col({ trip: a, date: dateA, items: (a.timeline || []).length, sumTotal: total(a), sm: summarize(a) })}${col({ trip: b, date: dateB, items: (b.timeline || []).length, sumTotal: total(b), sm: summarize(b) })}</div>`;
}
export function renderCompareDay({ day, itemsA, itemsB }) {
  const list = (items, side) => {
    if (!items.length) return `<p class="muted">予定なし</p>`;
    return items
      .map(
        (i) =>
          `<div class="compare-item" data-side="${side}">${render(i)}</div>`,
      )
      .join("");
  };
  return `<section class="compare-day"><h3>${day}日目</h3><div class="compare-grid"><div class="compare-col">${list(itemsA, "a")}</div><div class="compare-col">${list(itemsB, "b")}</div></div></section>`;
}
