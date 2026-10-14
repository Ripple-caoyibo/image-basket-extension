const scanButton = document.querySelector("#scan");
const statusText = document.querySelector("#status");
const grid = document.querySelector("#grid");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function collectImages() {
  const urls = new Set();
  document.querySelectorAll("img, source").forEach((node) => {
    const candidates = [node.currentSrc, node.src, node.srcset]
      .filter(Boolean)
      .flatMap((value) => String(value).split(","))
      .map((value) => value.trim().split(" ")[0])
      .filter(Boolean);
    candidates.forEach((url) => {
      try {
        urls.add(new URL(url, location.href).href);
      } catch {
        // Ignore malformed image URLs from the page.
      }
    });
  });
  return Array.from(urls).filter((url) => /^https?:|^data:image\//.test(url)).slice(0, 40);
}

function renderImages(urls) {
  grid.textContent = "";
  statusText.textContent = urls.length ? `找到 ${urls.length} 张图片。` : "这个页面没有发现可下载图片。";

  urls.forEach((url, index) => {
    const card = document.createElement("article");
    card.className = "item";
    card.innerHTML = `
      <img class="thumb" alt="图片预览 ${index + 1}">
      <div class="meta">
        <p title="${url}">${url}</p>
        <button type="button">下载</button>
      </div>
    `;
    card.querySelector("img").src = url;
    card.querySelector("button").addEventListener("click", () => {
      const extension = url.startsWith("data:") ? "png" : (url.split("?")[0].split(".").pop() || "jpg").slice(0, 5);
      chrome.downloads.download({
        url,
        filename: `image-basket/image-${String(index + 1).padStart(2, "0")}.${extension}`,
        saveAs: false
      });
    });
    grid.appendChild(card);
  });
}

async function scanPage() {
  statusText.textContent = "正在扫描当前页面...";
  grid.textContent = "";
  const tab = await getActiveTab();
  if (!tab?.id || tab.url?.startsWith("chrome://")) {
    statusText.textContent = "请在普通网页上使用这个插件。";
    return;
  }

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: collectImages
  });
  renderImages(result || []);
}

scanButton.addEventListener("click", scanPage);
scanPage();
