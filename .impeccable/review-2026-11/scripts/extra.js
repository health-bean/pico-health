const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const base = "http://localhost:3100";
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto(base + link, { waitUntil: "networkidle", timeout: 120000 });
  // Today: symptom chips
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "../shots/g-log-today.png" });
  // Past day, opened food row (Spinach) showing rating picker
  await page.getByText("See that day").click(); await page.waitForTimeout(2500);
  await page.getByLabel("Previous day").click(); await page.waitForTimeout(3000);
  const spinach = page.locator("button[aria-expanded]", { hasText: "Spinach" }).first();
  await spinach.scrollIntoViewIfNeeded(); await spinach.click(); await page.waitForTimeout(1500);
  await page.mouse.move(2, 2);
  await page.locator("h1").first().focus().catch(() => {});
  await page.waitForTimeout(500);
  await spinach.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.evaluate(() => window.scrollBy(0, -140));
  await page.screenshot({ path: "../shots/g-food-open.png" });
  // Food search in Quick Add
  await page.getByRole("button", { name: /^Add$/ }).first().click().catch(() => {});
  await page.waitForTimeout(1500);
  const search = page.locator('input[type="search"], input[placeholder*="earch"]').first();
  if (await search.count()) { await search.fill("spinach"); await page.waitForTimeout(4000); }
  await page.screenshot({ path: "../shots/g-search.png" });
  // My food list
  await page.goto(base + "/my-list", { waitUntil: "networkidle" }); await page.waitForTimeout(3000);
  await page.screenshot({ path: "../shots/g-mylist.png" });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
