const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  p.on("response", r => { if (r.url().includes("/api/")) console.log(r.status(), r.url()); });
  await p.goto("http://localhost:3100/login", { waitUntil: "networkidle" });
  await p.fill('input[type="email"]', "demo@picohealth.app");
  await p.fill('input[type="password"]', "demo1234");
  await p.click('button[type="submit"]');
  await p.waitForTimeout(8000);
  console.log(p.url()); console.log((await p.innerText("body")).slice(0, 600));
  await b.close();
})();
