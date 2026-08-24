const $ = (selector) => document.querySelector(selector);

let editingItemId = null;

const schemas = {
    activity: [
        ["time", "時刻", "text"],
        ["name", "名称", "text"],
        ["place", "場所", "text"]
    ],
    food: [
        ["time", "時刻", "text"],
        ["name", "店舗・食事名", "text"],
        ["place", "場所", "text"]
    ],
    hotel: [
        ["time", "時刻", "text"],
        ["name", "宿泊先・内容", "text"],
        ["place", "場所", "text"]
    ],
    station: [
        ["time", "時刻", "time"],
        ["name", "駅・停留所", "text"],
        ["kind", "発着", "select"],
        ["point", "番線・乗り場", "text"]
    ],
    transport: [
        ["departureTime", "出発時刻", "time"],
        ["arrivalTime", "到着時刻", "time"],
        ["from", "出発地点", "text"],
        ["to", "到着地点", "text"],
        ["line", "路線・列車名", "text"],
        ["destination", "行先", "text"],
        ["mode", "交通手段", "selectMode"],
        ["seat", "座席・号車", "text"]
    ],
    transfer: [
        ["arrivalTime", "到着時刻", "time"],
        ["departureTime", "出発時刻", "time"],
        ["arrivalStation", "到着側の駅", "text"],
        ["departureStation", "出発側の駅", "text"],
        ["arrivalPoint", "到着番線", "text"],
        ["departurePoint", "出発番線", "text"]
    ]
};

function escapeAttribute(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function renderFields(type, item = {}) {
    const schema = schemas[type] || schemas.activity;

    const html = schema.map(([key, label, fieldType]) => {
        if (fieldType === "select") {
            return `
                <label>
                    ${label}
                    <select data-field="${key}">
                        <option value="発">発</option>
                        <option value="着">着</option>
                    </select>
                </label>
            `;
        }

        if (fieldType === "selectMode") {
            return `
                <label>
                    ${label}
                    <select data-field="${key}">
                        <option value="train">電車</option>
                        <option value="bus">バス</option>
                        <option value="walk">徒歩</option>
                        <option value="other">その他</option>
                    </select>
                </label>
            `;
        }

        return `
            <label>
                ${label}
                <input
                    data-field="${key}"
                    type="${fieldType}"
                    value="${escapeAttribute(item[key] || "")}"
                >
            </label>
        `;
    }).join("");

    $("#itemFields").innerHTML = `<div class="field-grid">${html}</div>`;

    for (const element of $("#itemFields").querySelectorAll("[data-field]")) {
        const value = item[element.dataset.field];
        if (value !== undefined && value !== null) {
            element.value = value;
        }
    }
}

function addExpenseRow(expense = {}) {
    const row = document.createElement("div");
    row.className = "expense-row";
    row.innerHTML = `
        <input placeholder="費目" data-e="name" value="${escapeAttribute(expense.name || "")}">
        <input type="number" placeholder="単価" data-e="unitPrice" value="${expense.unitPrice ?? ""}">
        <input type="number" min="1" data-e="qty" value="${expense.qty || 1}">
        <select data-e="payment">
            <option value="cash">現金</option>
            <option value="ic">IC</option>
            <option value="prepaid">事前支払</option>
            <option value="card">カード</option>
            <option value="other">その他</option>
        </select>
        <button type="button" aria-label="費用明細を削除">×</button>
    `;

    row.querySelector("select").value = expense.payment || "cash";
    row.querySelector("button").addEventListener("click", () => row.remove());
    $("#expenseRows").append(row);
}

export function initEditor(onSave) {
    $("#itemType").addEventListener("change", () => {
        renderFields($("#itemType").value);
    });

    $("#addExpenseBtn").addEventListener("click", () => addExpenseRow());

    $("#itemForm").addEventListener("submit", (event) => {
        event.preventDefault();

        const type = $("#itemType").value;
        const item = {
            type,
            day: Number($("#itemDay").value || 1),
            notes: $("#itemNotes").value
                .split("\n")
                .map((text) => text.trim())
                .filter(Boolean),
            expenses: []
        };

        for (const element of $("#itemFields").querySelectorAll("[data-field]")) {
            item[element.dataset.field] = element.value;
        }

        if (type === "station") {
            item.tags = [{ type: "default", text: item.kind || "発" }];
            delete item.kind;
        } else if (type === "transport") {
            item.tags = [];
            if (item.seat) {
                item.tags.push({ type: "seat", text: item.seat });
            }
            delete item.seat;
        }

        for (const row of $("#expenseRows").children) {
            const getValue = (key) => row.querySelector(`[data-e="${key}"]`).value;
            const unitPrice = Number(getValue("unitPrice") || 0);
            const qty = Number(getValue("qty") || 1);

            item.expenses.push({
                name: getValue("name"),
                unitPrice,
                qty,
                total: unitPrice * qty,
                payment: getValue("payment"),
                planned: true,
                actual: false
            });
        }

        onSave(editingItemId, item);
        $("#itemDialog").close();
    });
}

export function openItemEditor(item = null, defaultDay = 1) {
    editingItemId = item?.id || null;

    $("#itemDialogTitle").textContent = item ? "旅程を編集" : "旅程を追加";
    $("#itemDay").value = item?.day || defaultDay;
    $("#itemType").value = item?.type || "activity";
    $("#itemNotes").value = (item?.notes || []).join("\n");
    $("#expenseRows").innerHTML = "";

    for (const expense of item?.expenses || []) {
        addExpenseRow(expense);
    }

    renderFields($("#itemType").value, item || {});
    $("#itemDialog").showModal();
}
