// === タブ切り替え ===
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// === 定数 ===
const STORAGE_KEY_SITES = "blockedSites";
const STORAGE_KEY_SCHEDULE = "schedule";
const MSG_UPDATE_RULES = "updateRules";

// === サイト管理 ===
const siteInput = document.getElementById("siteInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

async function renderSiteList(sites) {
  if (!sites) {
    const data = await chrome.storage.local.get(STORAGE_KEY_SITES);
    sites = data[STORAGE_KEY_SITES] ?? [];
  }

  siteList.innerHTML = "";

  if (sites.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "ブロック中のサイトはありません";
    siteList.appendChild(li);
    return;
  }

  for (const site of sites) {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.className = "domain";
    span.textContent = site;

    const btn = document.createElement("button");
    btn.className = "remove-btn";
    btn.textContent = "✕";
    btn.addEventListener("click", () => removeSite(site));

    li.appendChild(span);
    li.appendChild(btn);
    siteList.appendChild(li);
  }
}

async function addSite() {
  let site = siteInput.value.trim().toLowerCase();
  if (!site) return;

  site = site.replace(/^https?:\/\//, "");
  site = site.replace(/\/.*$/, "");

  const data = await chrome.storage.local.get(STORAGE_KEY_SITES);
  const sites = data[STORAGE_KEY_SITES] ?? [];

  if (sites.includes(site)) {
    siteInput.value = "";
    return;
  }

  sites.push(site);
  await chrome.storage.local.set({ [STORAGE_KEY_SITES]: sites });
  await chrome.runtime.sendMessage({ type: MSG_UPDATE_RULES });

  siteInput.value = "";
  renderSiteList(sites);
}

async function removeSite(site) {
  const data = await chrome.storage.local.get(STORAGE_KEY_SITES);
  const sites = (data[STORAGE_KEY_SITES] ?? []).filter((s) => s !== site);

  await chrome.storage.local.set({ [STORAGE_KEY_SITES]: sites });
  await chrome.runtime.sendMessage({ type: MSG_UPDATE_RULES });

  renderSiteList(sites);
}

addBtn.addEventListener("click", addSite);
siteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

// === スケジュール管理 ===
const DAYS = [
  { key: "mon", label: "月" },
  { key: "tue", label: "火" },
  { key: "wed", label: "水" },
  { key: "thu", label: "木" },
  { key: "fri", label: "金" },
  { key: "sat", label: "土" },
  { key: "sun", label: "日" }
];

// デフォルト: 全曜日OFF（= 常時ブロック）
function defaultSchedule() {
  const schedule = {};
  for (const day of DAYS) {
    schedule[day.key] = { enabled: false, start: "09:00", end: "18:00" };
  }
  return schedule;
}

async function getSchedule() {
  const data = await chrome.storage.local.get(STORAGE_KEY_SCHEDULE);
  return data[STORAGE_KEY_SCHEDULE] ?? defaultSchedule();
}

async function saveSchedule(schedule) {
  await chrome.storage.local.set({ [STORAGE_KEY_SCHEDULE]: schedule });
  await chrome.runtime.sendMessage({ type: MSG_UPDATE_RULES });
}

function renderSchedule(schedule) {
  const list = document.getElementById("scheduleList");
  list.innerHTML = "";

  for (const day of DAYS) {
    const entry = schedule[day.key];
    const li = document.createElement("li");

    // 曜日ラベル
    const label = document.createElement("span");
    label.className = "day-label";
    label.textContent = day.label;

    // ON/OFFトグル
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "day-toggle";
    toggle.checked = entry.enabled;

    // 時間帯
    const timeDiv = document.createElement("div");
    timeDiv.className = "time-inputs";

    const startInput = document.createElement("input");
    startInput.type = "time";
    startInput.value = entry.start;
    startInput.disabled = !entry.enabled;

    const sep = document.createElement("span");
    sep.textContent = "〜";

    const endInput = document.createElement("input");
    endInput.type = "time";
    endInput.value = entry.end;
    endInput.disabled = !entry.enabled;

    timeDiv.appendChild(startInput);
    timeDiv.appendChild(sep);
    timeDiv.appendChild(endInput);

    // トグル変更時
    toggle.addEventListener("change", () => {
      entry.enabled = toggle.checked;
      startInput.disabled = !toggle.checked;
      endInput.disabled = !toggle.checked;
      saveSchedule(schedule);
    });

    // 時間変更時
    startInput.addEventListener("change", () => {
      entry.start = startInput.value;
      saveSchedule(schedule);
    });
    endInput.addEventListener("change", () => {
      entry.end = endInput.value;
      saveSchedule(schedule);
    });

    li.appendChild(label);
    li.appendChild(toggle);
    li.appendChild(timeDiv);
    list.appendChild(li);
  }
}

// === 初期表示 ===
renderSiteList();
getSchedule().then(renderSchedule);
