// Card 3: My food list from its title, 390 x 570 css, same framing as before.
const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "load", timeout: 120000 });
  await page.goto("http://localhost:3100/my-list", { waitUntil: "load" });
  await page.getByText("Avoid on Low Histamine").waitFor({ timeout: 60000 }); await page.waitForTimeout(800);
  const h1 = page.locator("h1").first(); const bx = await h1.boundingBox();
  await page.evaluate((y) => window.scrollTo(0, window.scrollY + y - 76), bx.y); await page.waitForTimeout(500);
  const bb = await h1.boundingBox();
  await page.screenshot({ path: __dirname + "/../pdf/panel-3-list-now.png", clip: { x: 0, y: bb.y - 20, width: 390, height: 570 } });
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
