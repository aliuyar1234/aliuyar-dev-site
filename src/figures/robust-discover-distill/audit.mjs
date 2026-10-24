// Fig 19 geometry audit: every part recorded as its true shape, checked in the resting pose and in the poses the
// press passes through (stroke, feed, tablets in flight, screen in and out, spring tensioned, test reading).
import * as A from "../kit/audit.mjs";
import { compose, REST } from "./parts.mjs";
import { P } from "./scene.mjs";
import { STEPS, DIAL } from "./model.mjs";

// what the page shows: placements inlined, hidden parts left out
const shownSvg = (items, svg) =>
  svg
    .replace(/<g [^>]*style="opacity:0"><use [^>]*\/><\/g>/g, "")
    .replace(/<use [^>]*style="opacity:0"\/>/g, "")
    .replace(/<(circle|path) [^>]*style="opacity:0"\/>/g, "")
    .replace(/<use href="#rdd-([^"]+)"([^>]*)\/>/g, (_, id, rest) => `<g${rest}>${items.defs[id]}</g>`);

const at = (s, extra = {}) => ({ ...REST, s, ...extra });
export const POSES = [
  ["rest: top dead centre, shoe under the hopper, screen out", REST],
  ["bottom dead centre, screen in, spring tensioned and yielding", at(0.5, { screen: 1, anchor: 1, knob: 0, slide: 1 })],
  ["quarter turn: eccentric toward +y, rod at its steepest", at(0.25, { anchor: 1 })],
  ["three-quarter turn: eccentric toward −y", at(0.75, { screen: 1 })],
  ["tablet rising out of the die", at(10.74, { tablets: [10] })],
  ["shoe swept forward, pushing the tablet", at(10.86, { tablets: [10] })],
  ["shoe over the die, tablet in the channel", at(10.91, { tablets: [10] })],
  ["shoe returning, tablet at the channel end", at(11.2, { tablets: [10] })],
  ["tablet halfway down the chute", at(11.48, { tablets: [10, 11] })],
  ["screen halfway, spring halfway", at(5.3, { screen: 0.5, anchor: 0.5, knob: -60 })],
  ["reading: sample on the anvil, plunger down, needle and hands", at(STEPS, { landed: STEPS, sample: 1, plunger: 1, value: 3.713, limits: [0.827, 3.713] })],
  ["needle at the stops", at(STEPS, { landed: STEPS, sample: 1, plunger: 1, value: DIAL.max, limits: [0, DIAL.max] })],
];

export function audit() {
  let total = 0;
  for (const [label, pose] of POSES) {
    const items = compose(pose);
    const R = A.recorder(P);
    items.filter((item) => item.shapes.length).forEach((item, index) => R.put({ name: item.name, key: index, svg: shownSvg(items, item.svg), shapes: item.shapes.map((shape) => R.solid(shape(A))) }));
    const overlaps = A.overlapsOf(R.items, P);
    const result = {
      // the fill shows through the hopper's mouth and the spokes through the rim's front opening: each is clipped to
      // that opening, so the funnel, lip and rim in front of their hidden parts are drawn by the clip
      depth: A.depthOrder(R.items, P, { overlaps, allow: [["hopper.funnel", "hopper.fill"], ["hopper.lip", "hopper.fill"], ["drive.rim", "drive.spokes*"]] }),
      supports: A.supports(R.solids, R.tubes),
      cover: A.coverage(R.items, P),
      wobble: A.wobble(R.solids),
    };
    const count = A.failures(result);
    total += count;
    console.log(`\n— pose: ${label}`);
    console.log(A.report(result));
    console.log(`${R.solids.length} solids · ${R.items.length} items · ${overlaps.pairs.length} overlaps · ${count ? `${count} problem${count === 1 ? "" : "s"}` : "clean"}`);
  }
  console.log(total ? `\naudit failed: ${total} problem${total === 1 ? "" : "s"}` : "\naudit passed");
  return total;
}
