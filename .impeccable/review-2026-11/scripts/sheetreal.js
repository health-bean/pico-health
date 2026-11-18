const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "load", timeout: 120000 });
  await page.evaluate(() => localStorage.setItem("pico:insights-range", "180"));
  await page.waitForTimeout(2500);
  await page.getByText("See that day").click(); await page.waitForTimeout(2500);
  await page.getByLabel("Previous day").click(); await page.waitForTimeout(4000);
  const spinach = page.getByRole("button", { name: /Open Spinach/ });
  await spinach.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -200));
  await page.waitForTimeout(25000); // let the patterns arrive in the background
  await spinach.click(); await page.waitForTimeout(900);
  await page.screenshot({ path: "../shots/real-sheet-half.png" });
  await page.getByRole("button", { name: "Show more" }).click(); await page.waitForTimeout(900);
  await page.screenshot({ path: "../shots/real-sheet-full.png" });
  const dlg = page.getByRole("dialog");
  await dlg.evaluate((d) => d.scrollTo(0, d.scrollHeight)); await page.waitForTimeout(500);
  await page.screenshot({ path: "../shots/real-sheet-bottom.png" });
  const hasLog = await page.getByText("See it in Insights").count();
  console.log("your-log section:", hasLog);
  if (hasLog) {
    await dlg.evaluate((d) => d.scrollTo(0, 0)); await page.waitForTimeout(300);
    await page.getByText("See it in Insights").click();
    await page.waitForURL(/insights/);
    await page.waitForSelector("#watch-histamine", { timeout: 60000 }); await page.waitForTimeout(900);
    await page.screenshot({ path: "../shots/real-insights-focus.png" });
    await page.screenshot({ path: "../shots/real-insights-focus.png" });
    console.log("url", page.url());
  }
  await page.goto("http://localhost:3100/log", { waitUntil: "load" });
  console.log("errors", JSON.stringify(errs.slice(0, 3)));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
