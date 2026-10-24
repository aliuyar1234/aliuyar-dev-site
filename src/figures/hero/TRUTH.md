# Fig 1 · Decision checkweigher · truth

This figure models one idea: "I make AI decisions auditable". No paper and no measured data stand behind it. Every number below is a parameter of the model in `model.mjs` (or of the layout in `world.mjs`), not a measurement of a real system. The caption says so.

## The object, what moves, what it means

The figure shows a production-line checkweigher on a bench. A sealed model housing puts one decision per period onto the infeed belt. Each decision rides in a clear tray that holds its token and a stack of evidence slips, so the amount of evidence shows as height.

1. **Photo-eye.** The tray crosses the photo-eye and becomes the lit part: the decision being checked.
2. **Weigh belt.** The tray rides onto a short weigh belt with its own drive. The belt sits on a single-point load cell, whose binocular bore faces the viewer. The cell is read through a junction box and a plug on the bench.
3. **Weighing.** When the tray's centre reaches the middle of the weigh belt, the line weighs it. It compares the slip count with the tolerance τ set on the knurled knob. The display head shows the reading, and the cabinet printer prints one line.
4. **Pass.** A tray at or above τ, read with a valid signal, rides on into the downstream unit. That unit stands for whatever acts on the decision.
5. **Held.** Every other tray is knocked off the line by the pneumatic pusher and falls into a locked bin. That covers a tray that is short of τ, and also any tray weighed while the load-cell plug is pulled, which has no reading.

The stack light shows the state. It is red while a held decision is on its way to the bin, for 1.4 s after it lands, and for as long as the plug is out. Otherwise it is green. The stack light is the only colour in the drawing.

The motion means three things:

- Nothing downstream acts on a decision until its evidence has been checked against a stated threshold.
- When the check cannot be made, the default is to hold. The line fails closed.
- Every check leaves a chained record that you can verify later.

## Quantities

| Quantity | Value | Source |
|---|---|---|
| Units | about 1 cm of the real thing; z up, bench top z = 0 | `world.mjs` |
| Belt speed | 18 units/s, all belts | `SPEED` |
| Tray pitch | 36 units | `PITCH` |
| One decision every | 36 / 18 = 2.000 s | `PERIOD` |
| Tray | 20 × 16 × 4, walls 0.8; floor and far walls solid, near walls clear | `TRAY`, `traySvg()` |
| Slip | 8.4 × 10.4 × 1.8 units each, stacked with a small jitter; 3.5 px per slip on desktop, 2.0 px at 390 px wide (six slips: 21 px and 12 px) | `SLIP.t`, `slipsSvg()` |
| Tray leaves the housing at | x = −100.5 | `X_START` (housing face − half a tray − 0.5) |
| Photo-eye | beam at x = −44 | `EYE.x` |
| Weigh belt | x −37 to −7, 3 units of gap to each neighbouring belt, own gearmotor | `CONV.weigh` |
| Weighing happens at | x = −22, 4.361 s after leaving | `X_WEIGH`, `A_WEIGH` |
| Verdict rule | act if the plug is in and slips ≥ τ, else held | `advance()` |
| Fault | plug out: the weighing has no reading (n = null), so the decision is held and its line is printed as a fault | `advance()`, `setSignal()` |
| Push happens at | x = 24, 6.917 s after leaving | `X_REJECT`, `A_REJECT` (pusher axis) |
| Pusher stroke | 23 units: 0.22 s out (smoothstep), 0.10 s hold, 0.36 s back; pad face starts at y = −9 | `PUSH.stroke`, `PUSH_OUT`, `PUSH_HOLD`, `PUSH_BACK`, `PAD0` |
| Reject flight | the tray keeps the belt speed along x throughout. It starts to fall when its centre passes the belt edge (y = 12) at 0.120 s, then falls 15 units under g = 981 units/s² in 0.175 s. It lands 0.294 s after the push starts, at x = 29.3, y = 22, centred in the bin | `P_TIP`, `GRAVITY`, `P_LAND`, `LAND_X`, `Y_END` |
| Held tray lands at | 7.211 s after leaving | `A_REJECT + P_LAND` |
| Bin | x 18.3 to 40.3, y 12.6 to 31.2, 16 tall, locked with a padlock through a hasp | `BIN` |
| Bin stack | sinks one tray height in 0.55 s after each landing; the model keeps the last 6 and the drawing shows the top 2 | `SINK`, `stack` |
| Tray leaves the drawing at | x = 78, 9.917 s after leaving | `X_GONE`, `A_GONE` |
| Evidence per decision | 4 5 3 6 4 2 5 4 3 5 6 4 1 5 4 3, repeating; mean 4.0 | `SEQ` |
| Tolerance τ | 1 to 6, rests at 3 | `T_MIN`, `T_MAX`, `T_REST` |
| Held share of the sequence | τ1 0/16 · τ2 1/16 · τ3 2/16 · τ4 5/16 · τ5 10/16 · τ6 14/16 | counted from `SEQ` |
| Tamper | strips the slips from the frontmost unweighed tray on the infeed that still carries evidence and whose centre is before x = −47 (front edge not yet on the weigh belt). The slips lift 12 units and fade in 0.7 s. That tray is weighed 1.4 to 3.4 s later, so it is held at every τ | `tamper()`, `X_TAMPER`, `STRIP_OFF` |
| Lit part | the tray whose front edge crossed the photo-eye most recently, until the next one crosses; a pushed tray is never lit; outline and fill ease over 0.25 s | `litOf()`, `figure.css` |
| Stack light | red from a held weighing until 1.4 s after the last held tray lands, and always red while the plug is out; crossfade with a time constant of 0.12 s | `redUntil`, `RED_HOLD`, `redOf()` |
| Display | the digit is the slip count of the last weighing (`–` with no reading); six cells light up to that count, with a tick under cell τ | `parts.mjs` `SCREEN`, `gateU()` |
| Knob | τ 1 at 22.5°, then 45° per step to τ 6 at 247.5°, measured on the cabinet top from −y toward +x, so the scale faces the viewer; the pointer follows with a time constant of 0.09 s | `KNOB_FROM`, `KNOB_STEP`, `knobAngle()` |
| Knob input | horizontal drag, one step per 18 px; a tap steps +1 (6 wraps to 1); arrows ±1, Home 1, End 6; hit radius is the dial plate + 2 units, at least 22 screen px | `live.js` |
| Plug | pulls 3.6 units out of its socket along x, with a time constant of 0.1 s; hit radius 6 units, at least 22 screen px; P key, or Enter/Space on the plug | `PLUG.travel`, `live.js` |
| Journal line | one per weighing, 2.4 units pitch, feeds in 0.5 s; newest line at the top under the printer slot. Passed: a sequence mark and a bar 1.4 units per slip. Held: a solid bar across the strip. No reading: three blocks | `STRIP.pitch`, `FEED`, `journalSvg()` |
| Paper | 3 units of leader plus 2.4 per weighing. It hangs 21 units down the cabinet face. The rest rolls into a curl of radius √(1.4² + 0.4 · (paper − 21) / π), which grows with every line up to its 6-unit cap (reached at about weighing 119) | `LEAD`, `STRIP.drop`, `CURL`, `curlOf()`, `paperOf()` |
| Hash chain | FNV-1a 32-bit (basis 2166136261, prime 16777619) over the ASCII line `i\|n\|τ\|verdict` (n is `-` with no reading), folded into the previous head | `chain()`, `HEAD0` |
| Starting state | 34.2 s of model time: 15 weighed, 13 acted, 2 held, head c58b. The lamp is green, the pusher idle and 2 held trays sit in the bin. Decision 16 (3 slips) is lit on the weigh belt at x = −25, 0.17 s before it is weighed | `TAU0`, `createLine()` |
| Idle tour | runs from page load. Steps: τ 4 at 3 s, tamper at 9 s, τ 5 at 16 s, plug out at 22 s, plug back at 29 s, τ 3 at 34 s, repeating every 40 s. Any input stops it, and it restarts from the top 8 s after the last input. If the tour had pulled the plug, the first input reseats it | `live.js` `TOUR`, `TOUR_LOOP`, `IDLE` |
| Loop | one model step per animation frame, dt capped at 1/30 s; measured in headless Chrome: readout changes every 2000 ms at 60 fps | `live.js` `frame()` |

## Readout

`τ 3 · e 4 · #15 · c58b · 13 acted · 2 held`, all from `readoutOf(state)`:

- `τ`: the tolerance set on the knob.
- `e`: the evidence slips of the last weighed decision. It shows `–` before the first weighing or after a weighing with no reading. While the plug is out, `no signal` takes its place.
- `#`: the journal sequence number, which is the count of weighings so far.
- `c58b`: the first 4 hex digits of the hash-chain head after that line.
- `acted` and `held`: counts of each verdict. Their sum is `#`.

## Plainly

- The slip count stands in for "evidence", and τ stands in for a policy threshold. Real decision systems weigh evidence in richer ways, and the figure does not claim to show how.
- Fail closed here means one specific thing: a decision is acted on only after a valid reading at or above τ. With no reading, the default is hold. A short decision is held by the threshold itself, which is a filter, not the fail-closed part.
- FNV-1a is not a cryptographic hash. It shows the chaining idea: change or remove any line and every later head changes. A real audit trail would use a cryptographic hash and signatures.
- Under reduced motion, nothing moves on its own. The knob and the plug update the still frame at once. Tamper steps the model until the stripped tray has been weighed (and, if held, has landed), then shows that frame. A tray behind it may be weighed during those seconds, which is why `#` can rise by more than one.
