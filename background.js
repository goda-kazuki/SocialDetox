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

// storage からブロックリストを取得
async function getBlockedSites() {
  const data = await chrome.storage.local.get("blockedSites");
  return data.blockedSites ?? DEFAULT_BLOCKED_SITES;
}

// ブロックリストを storage に保存
async function saveBlockedSites(sites) {
  await chrome.storage.local.set({ blockedSites: sites });
}

// ブロックリストを declarativeNetRequest のルールに反映
async function updateBlockRules() {
  const sites = await getBlockedSites();

  // 既存の動的ルールをすべて削除
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existingRules.map((r) => r.id);

  // 新しいルールを作成（各サイトに一意のIDを振る）
  const addRules = sites.map((site, index) => ({
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

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: addRules
  });
}

// 拡張機能インストール時にデフォルトのブロックリストを設定
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get("blockedSites");
  if (!data.blockedSites) {
    await saveBlockedSites(DEFAULT_BLOCKED_SITES);
  }
  await updateBlockRules();
});

// 他の部分（popup等）からのメッセージを受信
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "updateRules") {
    updateBlockRules().then(() => sendResponse({ success: true }));
    return true; // 非同期レスポンスのために true を返す
  }
});
