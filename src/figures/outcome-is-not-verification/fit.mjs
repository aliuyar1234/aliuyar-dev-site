// Fig 13 fit (Node only, run by build.mjs): solves the binormal score model from the measured rates and checks data.fit.
// Valid and invalid steps sit d apart, so AUROC = Φ(d/√2) = PVS; the two steps of a strict flip share a component ρ, so
// P(s_valid > s_invalid) = Φ(d/√(2(1−ρ))) = FlipAcc. TraceOutcome scores only Ans, with d from TraceAUROC and ρ = 0.
import DATA from "./data.mjs";

function erf(x) {
  const s = Math.sign(x);
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  return s * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x));
}
function erfinv(x) {
  const a = 0.147;
  const ln = Math.log(1 - x * x);
  const t = 2 / (Math.PI * a) + ln / 2;
  let y = Math.sign(x) * Math.sqrt(Math.sqrt(t * t - ln / a) - t);
  for (let i = 0; i < 2; i++) y -= (erf(y) - x) / ((2 / Math.sqrt(Math.PI)) * Math.exp(-y * y));
  return y;
}
const probit = (p) => Math.SQRT2 * erfinv(2 * Math.min(p, 0.9995) - 1); // FlipAcc 1.000 is fitted as 0.9995
const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

export function fitOf(domain, target) {
  const row = DATA[domain];
  if (target === "trace") return [Math.SQRT2 * probit(row.trace), 0];
  const { flip, pvs } = row[target];
  const d = Math.SQRT2 * probit(pvs);
  const ratio = d / probit(flip);
  return [d, Math.max(0, Math.min(0.99, 1 - (ratio * ratio) / 2))];
}

// every stored [d, ρ] must match the solve and reproduce the paper's rates to the printed precision
export function checkFit() {
  const problems = [];
  for (const domain of ["arith", "logic"])
    for (const target of ["trace", "prefix", "local"]) {
      const [d, rho] = DATA.fit[domain][target];
      const [d0, rho0] = fitOf(domain, target);
      if (Math.abs(d - d0) > 1e-3 || Math.abs(rho - rho0) > 1e-3) problems.push(`${domain} ${target}: stored ${d}, ${rho} vs solved ${d0.toFixed(4)}, ${rho0.toFixed(4)}`);
      const row = DATA[domain];
      const want = target === "trace" ? [row.trace] : [row[target].pvs, Math.min(row[target].flip, 0.9995)];
      const got = target === "trace" ? [Phi(d / Math.SQRT2)] : [Phi(d / Math.SQRT2), Phi(d / Math.sqrt(2 * (1 - rho)))];
      want.forEach((w, i) => Math.abs(w - got[i]) > 1.5e-3 && problems.push(`${domain} ${target}: reproduces ${got[i].toFixed(4)}, paper ${w}`));
    }
  return problems;
}
