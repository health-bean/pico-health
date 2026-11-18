const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByLabel("Add from a list of foods, symptoms, and exercise").click();
  await page.waitForTimeout(2000);
  const input = page.getByRole("dialog").locator("input").first();
  await input.fill("spinach");
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "../shots/g-search.png" });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
