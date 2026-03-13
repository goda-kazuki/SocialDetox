const siteInput = document.getElementById("siteInput");
const addBtn = document.getElementById("addBtn");
const siteList = document.getElementById("siteList");

// ブロックリストを表示
async function renderList() {
  const data = await chrome.storage.local.get("blockedSites");
  const sites = data.blockedSites ?? [];

  siteList.innerHTML = "";

  if (sites.length === 0) {
    siteList.innerHTML = '<li class="empty">ブロック中のサイトはありません</li>';
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

// サイトを追加
async function addSite() {
  let site = siteInput.value.trim().toLowerCase();
  if (!site) return;

  // https:// や http:// が付いていたら除去
  site = site.replace(/^https?:\/\//, "");
  // 末尾のスラッシュやパスを除去
  site = site.replace(/\/.*$/, "");

  const data = await chrome.storage.local.get("blockedSites");
  const sites = data.blockedSites ?? [];

  if (sites.includes(site)) {
    siteInput.value = "";
    return; // 重複は追加しない
  }

  sites.push(site);
  await chrome.storage.local.set({ blockedSites: sites });
  await chrome.runtime.sendMessage({ type: "updateRules" });

  siteInput.value = "";
  renderList();
}

// サイトを削除
async function removeSite(site) {
  const data = await chrome.storage.local.get("blockedSites");
  const sites = (data.blockedSites ?? []).filter((s) => s !== site);

  await chrome.storage.local.set({ blockedSites: sites });
  await chrome.runtime.sendMessage({ type: "updateRules" });

  renderList();
}

// イベントリスナー
addBtn.addEventListener("click", addSite);
siteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

// 初期表示
renderList();
