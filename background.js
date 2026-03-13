// ブロック対象サイトの一覧を storage から読み取り、
// declarativeNetRequest のルールとして動的に登録する

// デフォルトのブロック対象
const DEFAULT_BLOCKED_SITES = [
  "www.youtube.com",
  "www.twitter.com",
  "x.com",
  "www.instagram.com",
  "www.tiktok.com"
];

// 曜日キーの対応（Date.getDay() → key）
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// storage からブロックリストを取得
async function getBlockedSites() {
  const data = await chrome.storage.local.get("blockedSites");
  return data.blockedSites ?? DEFAULT_BLOCKED_SITES;
}

// storage からスケジュールを取得
async function getSchedule() {
  const data = await chrome.storage.local.get("schedule");
  return data.schedule ?? null;
}

// 現在ブロックすべきかどうか判定
async function shouldBlock() {
  const schedule = await getSchedule();

  // スケジュール未設定 or 全曜日OFFなら常時ブロック
  if (!schedule) return true;

  const allDisabled = DAY_KEYS.every((key) => !schedule[key]?.enabled);
  if (allDisabled) return true;

  const now = new Date();
  const todayKey = DAY_KEYS[now.getDay()];
  const today = schedule[todayKey];

  // 今日がOFFなら → ブロックしない
  if (!today?.enabled) return false;

  // 今日がONなら → 時間帯内かチェック
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = today.start.split(":").map(Number);
  const [endH, endM] = today.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ブロックリストを declarativeNetRequest のルールに反映
async function updateBlockRules() {
  // 既存の動的ルールをすべて削除
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.map((r) => r.id);

  const blocking = await shouldBlock();
  let addRules = [];

  if (blocking) {
    const sites = await getBlockedSites();
    addRules = sites.map((site, index) => ({
      id: index + 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          extensionPath: "/blocked.html"
        }
      },
      condition: {
        urlFilter: `||${site}`,
        resourceTypes: ["main_frame"]
      }
    }));
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: addRules
  });
}

// 拡張機能インストール時にデフォルトのブロックリストを設定
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get("blockedSites");
  if (!data.blockedSites) {
    await chrome.storage.local.set({ blockedSites: DEFAULT_BLOCKED_SITES });
  }
  await updateBlockRules();
});

// 1分ごとにルールを再評価（時間帯の切り替わりを検知）
chrome.alarms.create("checkSchedule", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "checkSchedule") {
    await updateBlockRules();
  }
});

// 他の部分（popup等）からのメッセージを受信
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "updateRules") {
    updateBlockRules().then(() => sendResponse({ success: true }));
    return true;
  }
});
