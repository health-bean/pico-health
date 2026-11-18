// Card 2: the real Log, yesterday, from lunch; 390 x 570 css (the PDF card's shape), same framing as before.
const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "load", timeout: 120000 });
  await page.getByLabel("Previous day").click(); await page.waitForTimeout(3500);
  const lunch = page.locator("li", { has: page.locator("h3", { hasText: /^Lunch$/ }) }).first();
  await lunch.waitFor(); await page.mouse.move(1, 1);
  const bx = await lunch.boundingBox();
  await page.evaluate((y) => window.scrollTo(0, window.scrollY + y - 76), bx.y); await page.waitForTimeout(600);
  const bb = await lunch.boundingBox();
  await page.screenshot({ path: __dirname + "/../pdf/panel-2-log-now.png", clip: { x: 0, y: bb.y - 16, width: 390, height: 570 } });
  console.log((await page.locator("ol").first().innerText()).replace(/\n+/g, " | ").slice(0, 700));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
