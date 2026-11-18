// Usage: node shot.js <outPrefix> <path> [path...]
// Logs in as the demo account at 390px and screenshots each path (full page).
const { chromium } = require("playwright-core");
const base = process.env.BASE || "http://localhost:3100";
(async () => {
  const [prefix, ...paths] = process.argv.slice(2);
  const browser = await chromium.launch({
    executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium",
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto(base + link, { waitUntil: "load", timeout: 120000 });
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 120000 }); console.log("landed", page.url());
  if (process.env.RANGE) await page.evaluate((r) => localStorage.setItem("pico:insights-range", r), process.env.RANGE);
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(Number(process.env.WAIT || 2500));
    const name = `${prefix}-${p.replace(/[^a-z0-9]+/gi, "_")}.png`;
    await page.screenshot({ path: name, fullPage: true });
    const h = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0, k = 0; y < h && k < 8; y += 700, k++) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(300); await page.screenshot({ path: name.replace(".png", `-v${k}.png`) }); } // VIEWS
    console.log("saved", name);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
