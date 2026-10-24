// Fig 22 · the kit's lathe with step counts sized to the drawing: a 5 px chord round the rim (at least 12 steps).
// The kit's 3 px default is finer than a 0.1 px path can show at this scale; the silhouette error stays under 0.15 px.
import * as L from "../kit/lathe.mjs";
export * from "../kit/lathe.mjs";
const stepsOf = (r, P) => Math.max(12, Math.ceil((2 * Math.PI * r * L.scaleOf(P)) / 5 / 4) * 4);
const most = (profile) => Math.max(...profile.map((p) => p[1]));
export const disc = (s0, s1, r, F, P, o = {}) => L.disc(s0, s1, r, F, P, { steps: stepsOf(r, P), ...o });
export const ringBand = (s0, s1, rIn, rOut, F, P, o = {}) => L.ringBand(s0, s1, rIn, rOut, F, P, { steps: stepsOf(rOut, P), ...o });
export const solidOf = (profile, F, P, o = {}) => L.solidOf(profile, F, P, { steps: stepsOf(most(profile), P), ...o });
