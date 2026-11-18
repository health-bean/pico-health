const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.getByText("See that day").click(); await page.waitForTimeout(2500);
  await page.getByLabel("Previous day").click(); await page.waitForTimeout(3500);
  await page.addStyleTag({ content: "nav, [class*='fixed'] { display: none !important; }" });
  await page.screenshot({ path: "../shots/tl-full.png", fullPage: true });
  await b.close();
})();
