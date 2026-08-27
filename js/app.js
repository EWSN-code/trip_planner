import { Storage, setStorageUser, onStorageStatus } from "./storage.js";
import {
  applyTheme,
  watchSystemTheme,
  getDeviceTheme,
  setDeviceTheme,
} from "./theme.js";
import {
  isCloudConfigured,
  getCurrentSession,
  signIn,
  signUp,
  signOut,
} from "./cloud.js";
import { normalize, newTrip, copyTrip, copyItem, moveItem } from "./model.js";
import {
  uid,
  now,
  esc,
  yen,
  total,
  summarize,
  payments,
  categories,
  amount,
  pairByDay,
} from "./utils.js";
import { render, renderCompareSummary, renderCompareDay } from "./render.js";
import { init as initEditor, open as openEditor } from "./editor.js";
import {
  initRouteWizard,
  openRouteWizard,
  routeToTimeline,
} from "./route-wizard.js";
const $ = (s) => document.querySelector(s);
let state,
  day = 1,
  appStarted = false,
  editMode = false,
  pendingInsertIndex = -1,
  compareMode = false,
  compareSelection = [];
async function save() {
  await Storage.save(state);
}
function trip() {
  return state.trips.find((t) => t.id === state.settings.selectedTripId);
}
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").hidden = false;
  setTimeout(() => ($("#toast").hidden = true), 1500);
}
function list() {
  const fab = $("#floatingAddBtn");
  if (fab) fab.hidden = true;
  $("#listView").hidden = false;
  $("#detailView").hidden = true;
  $("#listNav").classList.add("active");
  $("#detailNav").classList.remove("active");
  $("#tripGrid").innerHTML =
    state.trips
      .map(
        (t) =>
          `<article class="card${compareMode ? " compare-mode" : ""}${compareSelection.includes(t.id) ? " selected" : ""}"><h3>${esc(t.name)}</h3><p class="muted">${esc(t.startDate)}${t.endDate ? ` 〜 ${esc(t.endDate)}` : ""}</p><p>${t.timeline.length}項目 / ${yen(total(t))}</p>${compareMode ? `<label class="card-radio"><input type="checkbox" name="comparePick" data-pick="${t.id}"${compareSelection.includes(t.id) ? " checked" : ""}>比較対象にする</label>` : `<div class="card-actions"><button data-open="${t.id}">開く</button><button class="sub" data-copy="${t.id}">複製</button><button class="danger" data-del="${t.id}">削除</button></div>`}</article>`,
      )
      .join("") || "<p>旅行がありません。</p>";
  document.querySelectorAll("[data-open]").forEach(
    (b) =>
      (b.onclick = () => {
        state.settings.selectedTripId = b.dataset.open;
        detail();
      }),
  );
  document.querySelectorAll("[data-copy]").forEach(
    (b) =>
      (b.onclick = async () => {
        state.trips.unshift(
          copyTrip(state.trips.find((t) => t.id === b.dataset.copy)),
        );
        await save();
        list();
      }),
  );
  document.querySelectorAll("[data-del]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (confirm("削除しますか？")) {
          state.trips = state.trips.filter((t) => t.id !== b.dataset.del);
          await save();
          list();
        }
      }),
  );
  document.querySelectorAll("[data-pick]").forEach(
    (r) =>
      (r.onchange = () => {
        const id = r.dataset.pick;
        if (r.checked) {
          if (!compareSelection.includes(id)) {
            if (compareSelection.length >= 2)
              compareSelection = compareSelection.slice(1);
            compareSelection.push(id);
          }
        } else {
          compareSelection = compareSelection.filter((x) => x !== id);
        }
        list();
      }),
  );
  const toggleEl = $("#compareModeToggle");
  if (toggleEl) {
    toggleEl.checked = compareMode;
    toggleEl.disabled = state.trips.length < 2;
  }
  const compareBtnEl = $("#compareBtn");
  if (compareBtnEl)
    compareBtnEl.disabled = !(compareMode && compareSelection.length === 2);
}
function sums(obj, labels) {
  return (
    Object.entries(obj)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .map(
        ([k, v]) =>
          `<div class="sum-row"><span>${esc(labels[k] || k)}</span><strong>${yen(v)}</strong></div>`,
      )
      .join("") || '<p class="muted">費用なし</p>'
  );
}
function actualBlock(i) {
  if (!i.expenses?.length) return "";
  const planned = i.expenses.reduce((sum, e) => sum + amount(e), 0);
  const recorded = i.expenses.some((e) => e.actual);
  const actual = i.expenses.reduce(
    (sum, e) => sum + (e.actual ? Number(e.actual.total || 0) : 0),
    0,
  );
  const diff = actual - planned;
  return `<div class="actual-summary"><span class="pill">予定 ${yen(planned)}</span>${recorded ? `<span class="pill cost">実績 ${yen(actual)}</span><span class="actual-diff ${diff > 0 ? "positive" : diff < 0 ? "negative" : ""}">差額 ${diff >= 0 ? "+" : ""}${yen(diff)}</span>` : ""}</div><div class="quick-actions"><button class="sub" data-actual="${i.id}">${recorded ? "実績を修正" : "実績を入力"}</button></div>`;
}
function openAddAt(index = -1) {
  pendingInsertIndex = index;
  $("#addMenuDialog").showModal();
}
function detail() {
  const t = trip();
  if (!t) return;
  $("#listView").hidden = true;
  $("#detailView").hidden = false;
  $("#detailView").classList.toggle("edit-mode", editMode);
  $("#floatingAddBtn").hidden = false;
  $("#viewModeBtn").textContent = editMode ? "編集を終了" : "旅程を編集";
  $("#listNav").classList.remove("active");
  $("#detailNav").classList.add("active");
  $("#detailNav").disabled = false;
  $("#printLink").classList.remove("disabled");
  $("#printLink").href = `print/index.html?trip=${encodeURIComponent(t.id)}`;
  $("#tripTitle").textContent = t.name;
  $("#tripDates").textContent = [t.startDate, t.endDate]
    .filter(Boolean)
    .join(" 〜 ");
  $("#totalAmount").textContent = yen(total(t));
  $("#itemCount").textContent = t.timeline.length;
  const days = Math.max(1, ...t.timeline.map((i) => Number(i.day || 1)));
  $("#dayCount").textContent = days;
  day = Math.min(day, days);
  const sm = summarize(t);
  $("#paymentSummary").innerHTML = sums(sm.payment, payments);
  $("#categorySummary").innerHTML = sums(sm.category, categories);
  $("#dayTabs").innerHTML = Array.from(
    { length: days },
    (_, i) =>
      `<button class="tab ${day === i + 1 ? "active" : ""}" data-day="${i + 1}">${i + 1}日目</button>`,
  ).join("");
  document.querySelectorAll("[data-day]").forEach(
    (b) =>
      (b.onclick = () => {
        day = Number(b.dataset.day);
        detail();
      }),
  );
  const items = t.timeline.filter((i) => Number(i.day || 1) === day);
  $("#timeline").innerHTML =
    items
      .map(
        (i) =>
          `<article class="timeline-item">${render(i)}${actualBlock(i)}<button class="more-btn" data-menu-toggle="${i.id}">︙</button><div class="item-menu" data-menu="${i.id}" hidden><button class="sub" data-edit="${i.id}">編集</button><button class="sub" data-copy-item="${i.id}">複製</button><button class="sub" data-before="${i.id}">前に追加</button><button class="sub" data-after="${i.id}">後に追加</button></div><div class="item-actions"><button class="sub" data-up="${i.id}">↑</button><button class="sub" data-down="${i.id}">↓</button><button class="sub" data-copy-item="${i.id}">複製</button><button class="sub" data-edit="${i.id}">編集</button><button class="danger" data-remove="${i.id}">削除</button></div></article>`,
      )
      .join("") || '<p class="muted">旅程がありません。</p>';
  document.querySelectorAll("[data-menu-toggle]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.stopPropagation();
        const m = document.querySelector(
          `[data-menu="${b.dataset.menuToggle}"]`,
        );
        document.querySelectorAll(".item-menu").forEach((x) => {
          if (x !== m) x.hidden = true;
        });
        m.hidden = !m.hidden;
      }),
  );
  document
    .querySelectorAll("[data-before]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          openAddAt(t.timeline.findIndex((i) => i.id === b.dataset.before))),
    );
  document
    .querySelectorAll("[data-after]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          openAddAt(t.timeline.findIndex((i) => i.id === b.dataset.after) + 1)),
    );
  document
    .querySelectorAll("[data-actual]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          openActual(t.timeline.find((i) => i.id === b.dataset.actual))),
    );
  document.querySelectorAll("[data-up]").forEach(
    (b) =>
      (b.onclick = async () => {
        moveItem(t, b.dataset.up, -1);
        await save();
        detail();
      }),
  );
  document.querySelectorAll("[data-down]").forEach(
    (b) =>
      (b.onclick = async () => {
        moveItem(t, b.dataset.down, 1);
        await save();
        detail();
      }),
  );
  document.querySelectorAll("[data-copy-item]").forEach(
    (b) =>
      (b.onclick = async () => {
        const source = t.timeline.find((i) => i.id === b.dataset.copyItem),
          idx = t.timeline.findIndex((i) => i.id === source.id);
        t.timeline.splice(idx + 1, 0, copyItem(source));
        await save();
        detail();
        toast("複製しました");
      }),
  );
  document.querySelectorAll("[data-edit]").forEach(
    (b) =>
      (b.onclick = () =>
        openEditor(
          t.timeline.find((i) => i.id === b.dataset.edit),
          day,
        )),
  );
  document.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = async () => {
        if (confirm("削除しますか？")) {
          t.timeline = t.timeline.filter((i) => i.id !== b.dataset.remove);
          await save();
          detail();
        }
      }),
  );
}
function refreshActualTotal() {
  const total = [...document.querySelectorAll('[data-a="total"]')].reduce(
    (sum, input) => sum + Number(input.value || 0),
    0,
  );
  $("#actualTotal").textContent = yen(total);
}
function openActual(item) {
  $("#actualItemId").value = item.id;
  $("#actualTitle").textContent = item.name || item.line || "実績を入力";
  $("#actualRows").innerHTML = item.expenses
    .map(
      (e, i) =>
        `<div class="actual-row" data-expense-index="${i}"><strong>${esc(e.name || "費用")}</strong><label>実績金額<input data-a="total" type="number" value="${e.actual?.total ?? amount(e)}"></label><label>支払方法<select data-a="payment">${Object.entries(
          payments,
        )
          .map(
            ([k, v]) =>
              `<option value="${k}" ${(e.actual?.payment || e.payment) === k ? "selected" : ""}>${v}</option>`,
          )
          .join(
            "",
          )}</select></label><label>状態<select data-a="status"><option value="paid" ${!e.actual || e.actual.status === "paid" ? "selected" : ""}>支払済み</option><option value="cancelled" ${e.actual?.status === "cancelled" ? "selected" : ""}>中止</option><option value="refunded" ${e.actual?.status === "refunded" ? "selected" : ""}>返金</option></select></label></div>`,
    )
    .join("");
  document
    .querySelectorAll('[data-a="total"]')
    .forEach((input) => input.addEventListener("input", refreshActualTotal));
  document
    .querySelectorAll('[data-a="status"]')
    .forEach((select) => select.addEventListener("change", refreshActualTotal));
  refreshActualTotal();
  $("#actualDialog").showModal();
}
function openTrip(t = null) {
  $("#tripDialogTitle").textContent = t ? "旅行を編集" : "新しい旅行";
  $("#tripId").value = t?.id || "";
  $("#tripName").value = t?.name || "";
  $("#startDate").value = t?.startDate || "";
  $("#endDate").value = t?.endDate || "";
  $("#travelers").value = (t?.travelers || []).join(", ");
  $("#tripDialog").showModal();
}
function showCompare() {
  const ids = compareSelection.slice(0, 2);
  const a = state.trips.find((t) => t.id === ids[0]);
  const b = state.trips.find((t) => t.id === ids[1]);
  if (!a || !b) return;
  const fab = $("#floatingAddBtn");
  if (fab) fab.hidden = true;
  $("#listView").hidden = true;
  $("#detailView").hidden = true;
  $("#compareView").hidden = false;
  $("#listNav").classList.add("active");
  $("#detailNav").classList.remove("active");
  $("#compareBackBtn").onclick = () => {
    compareSelection = [];
    compareMode = false;
    const tog = $("#compareModeToggle");
    if (tog) tog.checked = false;
    $("#compareView").hidden = true;
    $("#compareView").innerHTML = "";
    $("#listView").hidden = false;
    list();
  };
  const tabsHtml = `<div class="compare-tabs" id="compareTabs" role="tablist">`
    + `<button type="button" class="compare-tab active" data-side="a" role="tab" aria-selected="true">A: ${esc(a.name || "無題の旅行")}</button>`
    + `<button type="button" class="compare-tab" data-side="b" role="tab" aria-selected="false">B: ${esc(b.name || "無題の旅行")}</button>`
    + `</div>`;
  $("#compareHeader").innerHTML = tabsHtml + renderCompareSummary(a, b);
  $("#compareDays").innerHTML = pairByDay(a, b)
    .map((d) => renderCompareDay(d))
    .join("");
  const tabs = $("#compareTabs");
  if (tabs) {
    tabs.querySelectorAll(".compare-tab").forEach((btn) => {
      btn.onclick = () => {
        const side = btn.getAttribute("data-side");
        tabs.querySelectorAll(".compare-tab").forEach((b2) => {
          b2.classList.toggle("active", b2 === btn);
          b2.setAttribute("aria-selected", b2 === btn ? "true" : "false");
        });
        document
          .querySelectorAll("#compareDays .compare-side")
          .forEach((el) => el.toggleAttribute("hidden", el.getAttribute("data-side") !== side));
      };
    });
  }
}
function currentCloudTheme() {
  return state?.settings?.theme || "system";
}
function refreshThemeChoices() {
  const selected = getDeviceTheme() || currentCloudTheme();
  $("#themeSelect").value = selected;
  document
    .querySelectorAll("[data-theme-choice]")
    .forEach((b) =>
      b.classList.toggle("active", b.dataset.themeChoice === selected),
    );
  $("#themeDeviceOnly").checked = Boolean(getDeviceTheme());
}
function initThemeUI() {
  applyTheme(currentCloudTheme());
  watchSystemTheme(currentCloudTheme);
  $("#themeBtn").onclick = () => {
    refreshThemeChoices();
    $("#themeDialog").showModal();
  };
  $("#themeCloseBtn").onclick = $("#themeCancelBtn").onclick = () =>
    $("#themeDialog").close();
  document.querySelectorAll("[data-theme-choice]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#themeSelect").value = b.dataset.themeChoice;
        document
          .querySelectorAll("[data-theme-choice]")
          .forEach((x) => x.classList.toggle("active", x === b));
        applyTheme(b.dataset.themeChoice);
      }),
  );
  $("#themeSelect").onchange = () => applyTheme($("#themeSelect").value);
  $("#themeForm").onsubmit = async (e) => {
    e.preventDefault();
    const value = $("#themeSelect").value;
    if ($("#themeDeviceOnly").checked) {
      setDeviceTheme(value);
    } else {
      setDeviceTheme("");
      state.settings.theme = value;
      await save();
    }
    applyTheme(currentCloudTheme());
    $("#themeDialog").close();
    toast("テーマを変更しました");
  };
}
async function startApp() {
  if (appStarted) return;
  appStarted = true;
  state = normalize(await Storage.load());
  initThemeUI();
  initEditor(async (id, item) => {
    const t = trip();
    if (id) {
      const n = t.timeline.findIndex((i) => i.id === id);
      t.timeline[n] = { ...t.timeline[n], ...item, id };
    } else {
      const created = { ...item, id: uid(item.type) };
      pendingInsertIndex >= 0
        ? t.timeline.splice(pendingInsertIndex, 0, created)
        : t.timeline.push(created);
      pendingInsertIndex = -1;
    }
    t.updatedAt = now();
    await save();
    detail();
    toast("保存しました");
  });
  $("#newTripBtn").onclick = () => openTrip();
  $("#backBtn").onclick = $("#listNav").onclick = list;
  $("#detailNav").onclick = detail;
  $("#editTripBtn").onclick = () => openTrip(trip());
  $("#viewModeBtn").onclick = () => {
    editMode = !editMode;
    detail();
  };
  const openAdd = () => openAddAt(-1);
  $("#addItemBtn").onclick = openAdd;
  $("#addAtEndBtn").onclick = openAdd;
  $("#floatingAddBtn").onclick = openAdd;
  $("#addMenuClose").onclick = () => $("#addMenuDialog").close();
  document.querySelectorAll("[data-add-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#addMenuDialog").close();
        const mode = b.dataset.addMode;
        if (mode === "route") openRouteWizard(trip(), day, pendingInsertIndex);
        else openEditor(null, day, mode);
      }),
  );
  initRouteWizard(async (route) => {
    const t = trip();
    const created = routeToTimeline(route);
    route.insertIndex >= 0
      ? t.timeline.splice(route.insertIndex, 0, ...created)
      : t.timeline.push(...created);
    pendingInsertIndex = -1;
    t.updatedAt = now();
    await save();
    detail();
    toast("経路を追加しました");
  });
  document
    .querySelectorAll(".close")
    .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
  $("#actualCloseBtn").onclick = $("#actualCancelBtn").onclick = () =>
    $("#actualDialog").close();
  $("#actualForm").onsubmit = async (e) => {
    e.preventDefault();
    const item = trip().timeline.find((i) => i.id === $("#actualItemId").value);
    [...$("#actualRows").children].forEach((r, i) => {
      const status = r.querySelector(`[data-a="status"]`).value;
      const entered = Number(r.querySelector(`[data-a="total"]`).value || 0);
      item.expenses[i].actual = {
        total:
          status === "cancelled"
            ? 0
            : status === "refunded"
              ? -Math.abs(entered)
              : entered,
        payment: r.querySelector(`[data-a="payment"]`).value,
        status,
        recordedAt: now(),
      };
    });
    await save();
    $("#actualDialog").close();
    detail();
    toast("実績を保存しました");
  };
  $("#tripForm").onsubmit = async (e) => {
    e.preventDefault();
    let t = state.trips.find((x) => x.id === $("#tripId").value) || newTrip();
    t.name = $("#tripName").value;
    t.startDate = $("#startDate").value;
    t.endDate = $("#endDate").value;
    t.travelers = $("#travelers")
      .value.split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!state.trips.includes(t)) state.trips.unshift(t);
    state.settings.selectedTripId = t.id;
    await save();
    $("#tripDialog").close();
    detail();
  };
  $("#exportBtn").onclick = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    a.download = "travel-planner-backup.json";
    a.click();
  };
  $("#importBtn").onclick = () => $("#importInput").click();
  $("#importInput").onchange = async (e) => {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (d.trips) state = normalize(d);
      else if (d.trip && d.timeline) {
        const t = { ...newTrip(), ...d.trip, timeline: d.timeline };
        state.trips.unshift(t);
        state.settings.selectedTripId = t.id;
      }
      await save();
      list();
      toast("読み込みました");
    } catch {
      alert("JSONを読み込めませんでした");
    }
  };
  $("#compareModeToggle").onchange = (e) => {
    compareMode = e.target.checked;
    if (!compareMode) compareSelection = [];
    list();
  };
  $("#compareBtn").onclick = showCompare;
  list();
}
function setSyncStatus(kind, text) {
  const el = $("#syncStatus");
  el.className = kind || "";
  el.textContent = text;
}
async function boot() {
  onStorageStatus(setSyncStatus);
  if (!isCloudConfigured()) {
    setSyncStatus("", "ローカル");
    await startApp();
    return;
  }
  try {
    const session = await getCurrentSession();
    if (session) {
      setStorageUser(session.user);
      $("#userEmail").textContent = session.user.email || "";
      $("#logoutBtn").hidden = false;
      await startApp();
      return;
    }
    $("#authDialog").showModal();
  } catch (error) {
    setSyncStatus("error", "接続エラー");
    $("#authMessage").textContent = error.message;
    $("#authDialog").showModal();
  }
}
$("#authForm").onsubmit = async (e) => {
  e.preventDefault();
  $("#authMessage").textContent = "ログイン中…";
  try {
    const session = await signIn(
      $("#authEmail").value,
      $("#authPassword").value,
    );
    setStorageUser(session.user);
    $("#userEmail").textContent = session.user.email || "";
    $("#logoutBtn").hidden = false;
    $("#authDialog").close();
    await startApp();
  } catch (error) {
    $("#authMessage").textContent = error.message;
  }
};
$("#signupBtn").onclick = async () => {
  $("#authMessage").textContent = "登録中…";
  try {
    const session = await signUp(
      $("#authEmail").value,
      $("#authPassword").value,
    );
    if (session) {
      setStorageUser(session.user);
      $("#userEmail").textContent = session.user.email || "";
      $("#logoutBtn").hidden = false;
      $("#authDialog").close();
      await startApp();
    } else {
      $("#authMessage").textContent =
        "確認メールを確認後、ログインしてください。";
    }
  } catch (error) {
    $("#authMessage").textContent = error.message;
  }
};
$("#logoutBtn").onclick = async () => {
  await Storage.flush();
  await signOut();
  location.reload();
};
boot();
