import { uid } from "./utils.js";
const $ = (s) => document.querySelector(s);
let segmentSerial = 0;
const paymentOptions =
  '<option value="cash">現金</option><option value="ic">IC</option><option value="prepaid">事前支払</option><option value="card">カード</option><option value="other">その他</option>';
const modeOptions =
  '<option value="train">電車</option><option value="bus">バス</option><option value="walk">徒歩</option><option value="car">車</option><option value="other">その他</option>';
function segmentHtml(data = {}) {
  const n = ++segmentSerial;
  return `<section class="route-segment" data-route-segment><div class="route-segment-head"><h3>区間 <span data-segment-number>${n}</span></h3><div class="route-segment-actions"><button type="button" class="sub small" data-segment-up>↑</button><button type="button" class="sub small" data-segment-down>↓</button><button type="button" class="danger small" data-segment-remove>削除</button></div></div><div class="route-segment-grid"><label>交通手段<select data-r="mode">${modeOptions}</select></label><label>路線・列車名<input data-r="line" value="${data.line || ""}" required></label><label>行先<input data-r="destination" value="${data.destination || ""}"></label><label>座席・号車<input data-r="seat" value="${data.seat || ""}"></label><label>到着地点<input data-r="to" value="${data.to || ""}" required></label><label>到着時刻<input data-r="arrivalTime" type="time" value="${data.arrivalTime || ""}"></label><label>到着番線<input data-r="arrivalPoint" value="${data.arrivalPoint || ""}"></label><label>次の出発地点<input data-r="departureStation" placeholder="空欄なら到着地点と同じ"></label><label>連絡方法<select data-r="connectionMode"><option value="same">同じ駅・場所</option><option value="walk">徒歩連絡</option><option value="other">その他</option></select></label><label>連絡時間（分）<input data-r="connectionMinutes" type="number" min="0"></label><label>乗換メモ<input data-r="connectionNote" placeholder="地下通路を利用 など"></label><label>次の出発時刻<input data-r="nextDepartureTime" type="time" value="${data.nextDepartureTime || ""}"></label><label>次の出発番線<input data-r="nextDeparturePoint" value="${data.nextDeparturePoint || ""}"></label><label>到着地点の構内図URL<input data-r="stationMapUrl" type="url" value="${data.stationMapUrl || ""}"></label><div class="full"><details><summary>費用・予約</summary><div class="route-expense-grid"><input data-r="expenseName" placeholder="費目"><input data-r="unitPrice" type="number" placeholder="単価"><input data-r="qty" type="number" min="1" value="1"><select data-r="payment">${paymentOptions}</select></div><label class="check"><input data-r="reservationRequired" type="checkbox">予約が必要</label><div class="cols"><label>予約開始日時<input data-r="reservationOpenAt" type="datetime-local"></label><label>状態<select data-r="reservationStatus"><option value="not_open">受付開始前</option><option value="available">未予約</option><option value="reserved">予約済み</option></select></label></div><label>予約ページURL<input data-r="reservationUrl" type="url"></label></details></div></div></section>`;
}
function renumber() {
  [...$("#routeSegments").children].forEach(
    (x, i) => (x.querySelector("[data-segment-number]").textContent = i + 1),
  );
}
function bindSegment(el) {
  el.querySelector("[data-segment-remove]").onclick = () => {
    if ($("#routeSegments").children.length > 1) {
      el.remove();
      renumber();
    }
  };
  el.querySelector("[data-segment-up]").onclick = () => {
    const p = el.previousElementSibling;
    if (p) {
      p.before(el);
      renumber();
    }
  };
  el.querySelector("[data-segment-down]").onclick = () => {
    const n = el.nextElementSibling;
    if (n) {
      n.after(el);
      renumber();
    }
  };
}
function addSegment(data = {}) {
  const tmp = document.createElement("div");
  tmp.innerHTML = segmentHtml(data);
  const el = tmp.firstElementChild;
  $("#routeSegments").append(el);
  bindSegment(el);
  renumber();
}
function lastDestination(trip, day) {
  const items = (trip?.timeline || []).filter(
    (i) => Number(i.day || 1) === Number(day),
  );
  for (let i = items.length - 1; i >= 0; i--) {
    const x = items[i];
    if (x.type === "station")
      return { name: x.name, time: x.time || "", point: x.point || "" };
    if (x.type === "transfer")
      return {
        name: x.departureStation || x.station || "",
        time: x.departureTime || "",
        point: x.departurePoint || "",
      };
    if (x.type === "transport" && x.to)
      return { name: x.to, time: x.arrivalTime || "", point: "" };
  }
  return null;
}
export function initRouteWizard(onSave) {
  $("#addRouteSegmentBtn").onclick = () => addSegment();
  $("#routeCloseBtn").onclick = $("#routeCancelBtn").onclick = () =>
    $("#routeDialog").close();
  $("#routeForm").onsubmit = (e) => {
    e.preventDefault();
    const segments = [...$("#routeSegments").children].map((el) => {
      const g = (k) => el.querySelector(`[data-r="${k}"]`);
      return {
        mode: g("mode").value,
        line: g("line").value.trim(),
        destination: g("destination").value.trim(),
        seat: g("seat").value.trim(),
        to: g("to").value.trim(),
        arrivalTime: g("arrivalTime").value,
        arrivalPoint: g("arrivalPoint").value.trim(),
        departureStation:
          g("departureStation").value.trim() || g("to").value.trim(),
        connectionMode: g("connectionMode").value,
        connectionMinutes: Number(g("connectionMinutes").value || 0),
        connectionNote: g("connectionNote").value.trim(),
        nextDepartureTime: g("nextDepartureTime").value,
        nextDeparturePoint: g("nextDeparturePoint").value.trim(),
        stationMapUrl: g("stationMapUrl").value.trim(),
        expenseName: g("expenseName").value.trim(),
        unitPrice: Number(g("unitPrice").value || 0),
        qty: Number(g("qty").value || 1),
        payment: g("payment").value,
        reservationRequired: g("reservationRequired").checked,
        reservationOpenAt: g("reservationOpenAt").value,
        reservationStatus: g("reservationStatus").value,
        reservationUrl: g("reservationUrl").value.trim(),
      };
    });
    onSave({
      day: Number($("#routeDay").value || 1),
      insertIndex: Number($("#routeInsertIndex").value || -1),
      origin: $("#routeOrigin").value.trim(),
      originTime: $("#routeOriginTime").value,
      originPoint: $("#routeOriginPoint").value.trim(),
      originMap: $("#routeOriginMap").value.trim(),
      segments,
    });
    $("#routeDialog").close();
  };
}
export function openRouteWizard(trip, day = 1, insertIndex = -1) {
  $("#routeInsertIndex").value = insertIndex;
  $("#routeDay").value = day;
  const last = lastDestination(trip, day);
  $("#routeOrigin").value = last?.name || "";
  $("#routeOriginTime").value = last?.time || "";
  $("#routeOriginPoint").value = last?.point || "";
  $("#routeOriginMap").value = "";
  $("#routeSegments").innerHTML = "";
  segmentSerial = 0;
  addSegment();
  $("#routeDialog").showModal();
}
export function routeToTimeline(route) {
  const out = [];
  const day = route.day;
  out.push({
    id: uid("station"),
    type: "station",
    day,
    time: route.originTime,
    name: route.origin,
    point: route.originPoint,
    stationMapUrl: route.originMap,
    tags: [{ type: "default", text: "発" }],
    notes: [],
    expenses: [],
  });
  let from = route.origin,
    departureTime = route.originTime,
    departurePoint = route.originPoint;
  route.segments.forEach((s, index) => {
    const expenses = s.unitPrice
      ? [
          {
            name: s.expenseName || "交通費",
            unitPrice: s.unitPrice,
            qty: s.qty,
            total: s.unitPrice * s.qty,
            category: "transport",
            payment: s.payment,
          },
        ]
      : [];
    const reservation = s.reservationRequired
      ? {
          required: true,
          openAt: s.reservationOpenAt,
          status: s.reservationStatus,
          url: s.reservationUrl,
        }
      : undefined;
    out.push({
      id: uid("transport"),
      type: "transport",
      day,
      mode: s.mode,
      from,
      to: s.to,
      departureTime,
      arrivalTime: s.arrivalTime,
      line: s.line,
      destination: s.destination,
      tags: s.seat ? [{ type: "seat", text: s.seat }] : [],
      notes: [],
      expenses,
      reservation,
    });
    const hasNext = index < route.segments.length - 1;
    if (hasNext) {
      out.push({
        id: uid("transfer"),
        type: "transfer",
        day,
        arrivalStation: s.to,
        departureStation: s.departureStation || s.to,
        connectionMode: s.connectionMode,
        connectionMinutes: s.connectionMinutes,
        arrivalTime: s.arrivalTime,
        departureTime: s.nextDepartureTime,
        arrivalPoint: s.arrivalPoint,
        departurePoint: s.nextDeparturePoint,
        stationMapUrl: s.stationMapUrl,
        notes: [
          s.connectionMinutes
            ? `${s.connectionMode === "walk" ? "徒歩" : "連絡"} ${s.connectionMinutes}分`
            : "",
          s.connectionNote || "",
        ].filter(Boolean),
        expenses: [],
      });
      from = s.departureStation || s.to;
      departureTime = s.nextDepartureTime;
      departurePoint = s.nextDeparturePoint;
    } else {
      out.push({
        id: uid("station"),
        type: "station",
        day,
        time: s.arrivalTime,
        name: s.to,
        point: s.arrivalPoint,
        stationMapUrl: s.stationMapUrl,
        tags: [{ type: "default", text: "着" }],
        notes: [],
        expenses: [],
      });
    }
  });
  return out;
}
