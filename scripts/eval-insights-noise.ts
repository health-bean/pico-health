/**
 * How much of the Insights page is noise? Runs the real engine over logs in
 * which symptoms are independent of everything, so every row it would show
 * is a false positive. See lib/insights/null-sim.ts.
 *
 *   npm run eval:insights-noise            # 20 seeds per window
 *   npm run eval:insights-noise -- 50      # more seeds
 */
import { summarize, plantedRecall, acuteRecall } from '../lib/insights/null-sim';

const seeds = Number(process.argv[2] ?? 20);
const windows = [30, 90, 180];
const rows: Array<[string, string]> = [
  ['rowsShown', 'Rows on the page by default'],
  ['triggersShown', '  "may be causing" (non-early)'],
  ['combinationsShown', '    of which combinations'],
  ['timedShown', '    of which meal-timing'],
  ['propertyRowsShown', '  "keeping an eye on" (properties)'],
  ['helpersShown', '  "seem to help" (non-early)'],
  ['strong', 'Labelled strong'],
  ['rawFindings', 'Everything returned, early included'],
];

const results = windows.map(w => summarize(w, seeds));
const pad = (s: string, n: number) => s.padEnd(n);
console.log(`\nNo real pattern exists in these logs. Median (max) over ${seeds} seeds.\n`);
console.log(pad('', 40) + windows.map(w => pad(`${w} days`, 14)).join(''));
for (const [key, label] of rows) {
  console.log(pad(label, 40) + results.map(r => {
    const v = r[key as keyof typeof r];
    return pad(`${v.median} (${v.max})`, 14);
  }).join(''));
}
console.log();

console.log(`Real effects planted in otherwise-random logs: share of ${seeds} seeds where each is shown.\n`);
console.log(pad('', 40) + windows.map(w => pad(`${w} days`, 14)).join(''));
const recalls = windows.map(w => plantedRecall(w, seeds));
recalls[0].forEach(({ effect }, i) => {
  const label = `${effect.cause} → ${effect.symptom} (${effect.multiplier}×)`;
  console.log(pad(label, 40) + recalls.map(r => pad(`${Math.round(r[i].recall * 100)}%`, 14)).join(''));
});
console.log();

const early = [7, 10, 14, 21, 30];
console.log(`Obvious acute reaction (hives 15 min to 3 h after the food), logged as it happens:\n`);
console.log(pad('', 40) + early.map(w => pad(`${w}d`, 8)).join(''));
for (const [cause, mult, note] of [['Oatmeal', 10, 'every 3rd day'], ['Tomatoes', 10, 'every 6th day'], ['Oatmeal', 4, 'every 3rd day']] as const) {
  const r = acuteRecall(cause, mult, early, seeds);
  console.log(pad(`${cause} ${mult}× (${note})`, 40) + r.map(x => pad(`${Math.round(x * 100)}%`, 8)).join(''));
}
console.log();
