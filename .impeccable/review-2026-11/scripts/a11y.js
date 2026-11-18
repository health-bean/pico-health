const { chromium } = require("playwright-core");
const fs = require("fs");
(async () => {
  const b = await chromium.launch({ executablePath: require("os").homedir() + "/Library/Caches/ms-playwright/chromium-1140/chrome-mac/Chromium.app/Contents/MacOS/Chromium" });
  const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  const link = require("child_process").execSync("node " + __dirname + "/link.js").toString().trim();
  await page.goto("http://localhost:3100" + link, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(2500);
  await page.getByText("See that day").click(); await page.waitForTimeout(2500);
  await page.getByLabel("Previous day").click(); await page.waitForTimeout(3500);
  if (process.env.OPEN_SHEET) { await page.waitForTimeout(20000); await page.getByRole("button", { name: /Open Spinach/ }).click(); await page.waitForTimeout(900); }
  await page.addScriptTag({ content: fs.readFileSync(__dirname + "/node_modules/axe-core/axe.min.js", "utf8") });
  const res = await page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, ex: v.nodes.slice(0, 3).map((n) => (n.target.join(" ") + " | " + (n.any[0]?.message || n.all[0]?.message || "")).slice(0, 220)) }));
  });
  console.log(JSON.stringify(res, null, 1));
  // Touch targets: interactive elements smaller than 44x44 that are visible
  const small = await page.evaluate(() => [...document.querySelectorAll("button, a, [role=button], summary")].map((el) => { const r = el.getBoundingClientRect(); return { t: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; }).filter((x) => x.w > 0 && (x.w < 44 || x.h < 44)));
  console.log("SMALL TARGETS", JSON.stringify(small.slice(0, 12)));
  const hasMain = await page.evaluate(() => !!document.querySelector("main"));
  const headings = await page.evaluate(() => [...document.querySelectorAll("h1,h2,h3")].map((h) => h.tagName + ":" + h.textContent.trim().slice(0, 30)).slice(0, 14));
  const timeEls = await page.evaluate(() => document.querySelectorAll("time").length);
  const reduced = await page.evaluate(() => [...document.styleSheets].some((ss) => { try { return [...ss.cssRules].some((r) => r.conditionText && r.conditionText.includes("prefers-reduced-motion")); } catch { return false; } }));
  console.log("MAIN", hasMain, "TIME_ELEMENTS", timeEls, "REDUCED_MOTION_RULES", reduced);
  console.log("HEADINGS", JSON.stringify(headings));
  const vp = await page.evaluate(() => document.querySelector('meta[name=viewport]')?.content);
  console.log("VIEWPORT", vp);
  await b.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
