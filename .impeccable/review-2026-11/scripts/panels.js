const { chromium } = require("playwright-core");
const H = 570; // css px: the PDF panel's shape (262 x 383 pt)
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  const base = "http://localhost:3100";
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto(base + link, { waitUntil: "load", timeout: 120000 });
  await page.evaluate(() => localStorage.setItem("pico:insights-range", "90"));
  // Crop away the app's header and tab bar: the panel frames the content itself.
  const chrome = async () => {}; // no hiding: crop between the app header and the bottom bars instead
  const shot = async (name, topEl, pad = 16, endEl = null) => {
    const box = await topEl.boundingBox();
    await page.evaluate((y) => window.scrollTo(0, window.scrollY + y - 60 - 16), box.y);
    await page.waitForTimeout(500);
    const bb = await topEl.boundingBox();
    const y0 = bb.y - pad;
    const h = endEl ? (await endEl.boundingBox()).y + (await endEl.boundingBox()).height + 16 - y0 : H;
    await page.screenshot({ path: `../pdf/${name}.png`, clip: { x: 0, y: y0, width: 390, height: h } });
  };
  // 1. Insights: leftovers card, then the histamine pattern.
  await page.goto(base + "/insights", { waitUntil: "load" });
  await page.getByText("Possible triggers").waitFor({ timeout: 90000 });
  await page.waitForTimeout(1500); await chrome();
  await shot("panel-1-insights", page.locator("article", { hasText: "Leftover food" }), 10, page.locator("article", { hasText: "Foods with histamine" }));
  // 2. The Log, Wed Oct 28, from lunch.
  await page.goto(base + "/log", { waitUntil: "load" });
  await page.getByText("See that day").click(); await page.waitForTimeout(2500);
  await page.getByLabel("Previous day").click(); await page.waitForTimeout(3500);
  await chrome(); await page.mouse.move(1, 1);
  await shot("panel-2-log", page.locator("li", { has: page.locator("h3", { hasText: /^Lunch$/ }) }).first(), 16);
  // 3. My food list from the top.
  await page.goto(base + "/my-list", { waitUntil: "load" });
  await page.getByText("Avoid on Low Histamine").waitFor({ timeout: 60000 });
  await page.waitForTimeout(800); await chrome();
  await shot("panel-3-list", page.locator("h1").first(), 20);
  console.log("errors", JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
