const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "networkidle", timeout: 120000 });
  await page.evaluate(() => localStorage.setItem("pico:insights-range", "180"));
  await page.goto("http://localhost:3100/insights", { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(15000);
  const prev = page.getByRole("button", { name: process.env.PREV || "Previous day" }).last();
  for (let i = 0; i < 19; i++) { await prev.click(); await page.waitForTimeout(700); }
  await page.waitForTimeout(3000);
  await prev.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -100));
  await page.screenshot({ path: "../shots/dayview.png" });
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.screenshot({ path: "../shots/dayview2.png" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "../shots/top.png" });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
