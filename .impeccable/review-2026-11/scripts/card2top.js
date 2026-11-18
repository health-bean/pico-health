// Card 2 from the top of yesterday: below the app header, 390 x 570 css, no tab bar.
const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "load", timeout: 120000 });
  await page.getByLabel("Previous day").click(); await page.waitForTimeout(3500);
  await page.evaluate(() => window.scrollTo(0, 0)); await page.mouse.move(1, 1); await page.waitForTimeout(600);
  // Start at "Any symptoms yesterday?", just under the app header.
  const q = page.getByText(/^Any symptoms (yesterday|this day)\?$/).first();
  const bx = await q.boundingBox();
  // The date bar is pinned under the app header; scroll so the question sits just below it.
  const bar = page.getByLabel("Previous day").locator("xpath=..");
  const barH = (await bar.boundingBox()).height;
  await page.evaluate((y) => window.scrollTo(0, window.scrollY + y), bx.y - (56 + barH + 14)); await page.waitForTimeout(600);
  const hdr = await page.locator("header").first().boundingBox();
  await page.screenshot({ path: __dirname + "/../pdf/panel-2-log-top.png", clip: { x: 0, y: hdr.y + hdr.height, width: 390, height: 570 } });
  await page.screenshot({ path: __dirname + "/../pdf/log-top-full.png" });
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
