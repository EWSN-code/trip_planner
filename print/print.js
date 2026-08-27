import { Storage } from "../js/storage.js";
import { normalize } from "../js/model.js";
import { esc, yen, amount, categories, payments } from "../js/utils.js";
const s = normalize(await Storage.load()),
  id = new URLSearchParams(location.search).get("trip"),
  t = s.trips.find((x) => x.id === id) || s.trips[0],
  root = document.querySelector("#root");
function item(i) {
  const tm = i.time || i.departureTime || i.arrivalTime || "",
    title = i.name || i.line || i.station || i.arrivalStation || i.type,
    c = (i.expenses || []).reduce((x, e) => x + amount(e), 0),
    detail = (i.expenses || [])
      .map(
        (e) =>
          `${esc(e.name)} ${yen(e.unitPrice)}×${e.qty || 1} (${esc(categories[e.category] || "")}/${esc(payments[e.payment] || "")})`,
      )
      .join(" / ");
  return `<div class="item"><div class="time">${esc(tm)}</div><div class="${i.type === "transport" ? "transport" : ""}"><div class="title">${esc(title)} ${i.point ? `<span class="pill">${esc(i.point)}</span>` : ""}</div>${c ? `<div class="meta"><span class="pill cost">${yen(c)}</span> ${detail}</div>` : ""}${i.notes?.length ? `<div class="meta">${i.notes.map(esc).join(" / ")}</div>` : ""}</div></div>`;
}
if (!t) root.textContent = "旅行がありません";
else {
  const d = Math.max(1, ...t.timeline.map((i) => Number(i.day || 1)));
  root.innerHTML = Array.from({ length: d }, (_, n) => {
    const a = t.timeline.filter((i) => Number(i.day || 1) === n + 1),
      sum = a
        .flatMap((i) => i.expenses || [])
        .reduce((x, e) => x + amount(e), 0);
    return `<section class="page"><div class="head"><h1>${esc(t.name)} ${n + 1}日目</h1><strong>${yen(sum)}</strong></div>${a.map(item).join("")}</section>`;
  }).join("");
}
