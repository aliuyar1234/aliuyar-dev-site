// Static art for Fig 2: pure ESM, runs at build time. live.js moves it.
import * as k from "../kit/iso-kit.mjs";
import { W_PX as W, H_PX as H } from "./scene.mjs";
import { compose, REST } from "./parts.mjs";
import { STATIONS, JUDGES, readoutOf } from "./model.mjs";

export const TITLE = "Criterion balance";
export const HINT = "Pick a card · turn the knob";

export const KEYS = [
  { mark: "lit", label: "Criterion card in the reader: the punched hole names the winning pan, the printed lines are the wording" },
  { mark: "raised", label: "Poise, set by the carriage while the beam is arrested; it tips the beam" },
  { mark: "line", label: "Tongue: BaseAcc (of 600), or Inv@BC / Sens@BC (of the base-right families); centre 50%, stop 100%" },
  { mark: "flat", label: "Register stacks, of 600: right on base · base and both paraphrases · base and counterfactual · all four (GCF)" },
  { mark: "dim", label: "Sight gauges: OrderDisagreement per variant (base, para 1, para 2, counterfactual); dial: First-pos" },
  { mark: "green", label: "Lamp: rate above 50%" },
  { mark: "red", label: "Lamp: rate at or below 50%" },
];

export const CAPTION =
  "The paper tests whether an LLM judge follows its criterion: each family keeps two candidates fixed and varies only the criterion over four variants (a base criterion, two paraphrases that keep its meaning, and a counterfactual that hands the win to the other candidate), each scored with the candidates in both orders. On BioRubric, where both candidates are true biographies, Llama-3.1-8B is right on the base criterion in 72.7% of 600 test families and right on all four variants (GCF) in 21.7%. It follows the counterfactual in 42.9% of the families it gets right on the base criterion (Sens@BC), and its verdict changes when the candidates swap order on 94.4% of variants. A strict criterion-emphasis prompt lifts Qwen2.5-14B to GCF 67.0%, 19.3 points below its BaseAcc, and raises Llama's first-shown choice rate from 92.2% to 99.4%.";

const LABEL =
  "A precision balance on a bench. Two candidate biographies sit on its pans; a carriage on a rail above the beam sets the poise, arrest pins hold the beam level while it moves, and a tongue reads the lean on a scale. A shuttle in front holds the criterion cards; the loaded card is lifted into a reader whose sensing pin finds the punched hole, whose lamps report the verdict, and whose console shows order disagreement on four sight gauges and the first-shown rate on a dial. A register at the back files the 600 test families into four stacks; a rotary switch picks the judge.";

const escape = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Rewrite absolute M/L/Z path data as relative moves at the same 0.1 precision: the
// kit writes every point rounded to a tenth, so the differences are exact.
const tenth = (value) => {
  const text = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "").replace(/^(-?)0\./, "$1.");
  return text === "-0" ? "0" : text;
};
const pair = (dx, dy) => {
  const a = tenth(dx);
  const b = tenth(dy);
  return a + (b.startsWith("-") ? "" : " ") + b;
};
export function compact(d) {
  if (/[^MLZ0-9.\-\s,]/.test(d)) return d;
  let out = "";
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let run = false;
  for (const [, cmd, args] of d.matchAll(/([MLZ])([^MLZ]*)/g)) {
    if (cmd === "Z") {
      out += "z";
      run = false;
      cx = sx;
      cy = sy;
      continue;
    }
    const nums = args.trim().split(/[\s,]+|(?=-)/).filter(Boolean).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = Math.round(nums[i] * 10) / 10;
      const y = Math.round(nums[i + 1] * 10) / 10;
      const move = cmd === "M" && i === 0;
      if (move) {
        out += `M${tenth(x)} ${tenth(y)}`;
        sx = x;
        sy = y;
        run = false;
      } else if (Math.abs(x - cx) > 1e-9 || Math.abs(y - cy) > 1e-9) {
        const text = pair(x - cx, y - cy);
        out += run ? (text.startsWith("-") ? text : ` ${text}`) : `l${text}`;
        run = true;
      }
      cx = x;
      cy = y;
    }
  }
  return out;
}
// Creases default to the faint tone in figure.css, so the attribute can go.
export const compactSvg = (svg) => svg.replace(/ d="([^"]*)"/g, (_, d) => ` d="${compact(d)}"`).replace(/class="iso-line iso-crease" data-tone="faint"/g, 'class="iso-line iso-crease"');

export function render() {
  const items = compose(REST);
  const svg = k.figureSvg({ width: W, height: H, label: LABEL, body: items.map((item) => item.svg) });
  const lines = readoutOf(JUDGES[REST.judge], STATIONS[REST.station]);
  const stage = `<div class="iso-stage cf-stage" tabindex="0" role="group" aria-roledescription="interactive figure" aria-label="Criterion balance. Left and right arrows or keys 1 to 3 swap the criterion card; up and down arrows turn the judge selector.">${compactSvg(svg)}<span class="cf-live" aria-live="polite"></span></div>`;
  let html = k.plateHtml({ title: TITLE, hint: HINT, readout: "", keys: KEYS, caption: CAPTION, body: stage });
  html = html.replace(" data-readout></span>", ` data-readout>${lines.map((line, index) => `<span class="cf-l${index + 1}">${escape(line)}</span>`).join("")}</span>`);
  return { html };
}

export const PARTS = () => compose(REST).length;
