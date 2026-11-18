// node days.js <prefix> <nDays>: open the last logged day, then step back, screenshotting each.
const { chromium } = require("playwright-core");
const base = process.env.BASE || "http://localhost:3100";
(async () => {
  const [prefix, n = "3"] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto(base + link, { waitUntil: "networkidle", timeout: 120000 });
  await page.getByText("See that day").click();
  await page.waitForTimeout(3000);
  for (let i = 0; i < Number(n); i++) {
    await page.screenshot({ path: `${prefix}-day${i}.png`, fullPage: true }); for (const [j, y] of [[0, 900], [1, 1700]]) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(400); await page.screenshot({ path: `${prefix}-day${i}-v${j}.png` }); } await page.evaluate(() => window.scrollTo(0, 0));
    console.log("saved", `${prefix}-day${i}.png`);
    if (i === 0 && process.env.EXPAND) {
      await page.locator("button[aria-expanded]").filter({ hasText: /./ }).nth(2).click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${prefix}-expanded.png`, fullPage: true });
    }
    await page.getByLabel("Previous day").click();
    await page.waitForTimeout(3000);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
