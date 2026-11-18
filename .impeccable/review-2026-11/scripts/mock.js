const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await page.goto("file://" + __dirname + "/../gallery/index.html", { waitUntil: "load" });
  await page.waitForTimeout(1500);
  const el = await page.$(process.env.SEL || "#tlx-h");
  const sec = await el.evaluateHandle((h) => h.closest("section"));
  await sec.screenshot({ path: "../shots/mock-tl.png" });
  await b.close();
})();
