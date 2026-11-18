// Final captures on Sarah's re-seeded data: 3 phone screens + 3 PDF crops.
const { chromium } = require("playwright-core");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const ctx = await b.newContext({ viewport: { width: 365, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = []; page.on("pageerror", (e) => errs.push(e.message));
  const base = "http://localhost:3100";
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto(base + link, { waitUntil: "load", timeout: 120000 });
  await page.evaluate(() => localStorage.setItem("pico:insights-range", "90"));
  const out = "../final2n"; require("fs").mkdirSync(out, { recursive: true });
  // Scroll an element just under the 56px header, then clip from a to b (css px, viewport coords).
  const at = async (el, top = 72) => { const bx = await el.boundingBox(); await page.evaluate((y) => window.scrollTo(0, window.scrollY + y), bx.y - top); await page.waitForTimeout(500); };
  const clip = async (name, a, bEl, pad = 14) => {
    const ta = await a.boundingBox(); const tb = await bEl.boundingBox();
    await page.screenshot({ path: `${out}/${name}.png`, clip: { x: 0, y: ta.y - pad, width: 365, height: tb.y + tb.height + pad - (ta.y - pad) } });
  };

  // 1. Food list, top.
  await page.goto(base + "/my-list", { waitUntil: "load" });
  await page.getByText("Avoid on Low Histamine").waitFor({ timeout: 60000 });
  await page.waitForTimeout(800); await page.evaluate(() => window.scrollTo(0, 0)); await page.mouse.move(1, 1);
  await page.screenshot({ path: `${out}/1-food-list.png` });

  // 2. Insights from "Possible triggers".
  await page.goto(base + "/insights", { waitUntil: "load" });
  const trig = page.getByRole("heading", { name: "Possible triggers" });
  await trig.waitFor({ timeout: 90000 }); await page.waitForTimeout(1500);
  await at(trig, 78);
  await page.screenshot({ path: `${out}/2-insights.png` });
  // PDF crop A: the red section, heading to the end of its panel.
  const trigSec = page.locator("section", { has: trig });
  await clip("pdf-a-triggers", trig, trigSec.locator("div.rounded-xl").first());
  // PDF crop B: ochre + teal, from the watch heading to the end of the helper panel.
  const watch = page.getByRole("heading", { name: "Patterns worth keeping an eye on" });
  const helpSec = page.locator("section", { has: page.getByRole("heading", { name: "Things that seem to help" }) });
  await at(watch, 72);
  await clip("pdf-b-watch-help", watch, helpSec.locator("div.rounded-xl").first());

  // 3. Log, the showcase day (yesterday), from lunch.
  await page.goto(base + "/log", { waitUntil: "load" });
  await page.getByLabel("Previous day").click(); await page.waitForTimeout(3500);
  const lunch = page.locator("li", { has: page.locator("h3", { hasText: /^Lunch$/ }) }).first();
  await lunch.waitFor(); await page.mouse.move(1, 1);
  await at(lunch, 66);
  await page.screenshot({ path: `${out}/3-log-day.png` });
  // PDF crop C: lunch through brain fog (below the header's edge).
  await clip("pdf-c-log", lunch, page.locator("li", { hasText: "Brain fog" }).first(), 8);
  console.log("log day text:", (await page.locator("ol").first().innerText()).slice(0, 600));
  console.log("errors", JSON.stringify(errs));
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
