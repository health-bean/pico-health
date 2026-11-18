const { chromium } = require("playwright-core");
const { execSync } = require("child_process");
(async () => {
  const link = execSync("node /Users/health-bean/Coding/pico-health-redesign/.impeccable/review-2026-11/scripts/link.js").toString().trim();
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" }); const c = await b.newContext(); const p = await c.newPage();
  await p.goto("http://localhost:3100" + link); await p.waitForURL(/\/log/);
  for (const d of [90, 180]) {
    const r = await c.request.get("http://localhost:3100/api/insights/patterns?days=" + d);
    require("fs").writeFileSync(`patterns-${d}.json`, await r.text());
  }
  await b.close();
})();
