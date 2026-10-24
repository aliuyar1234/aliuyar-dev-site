# Fig 9 · Blink comparator: truth table

Paper: *Surgical Post-Training Diffing: Partial Recovery Without Clean Small-Mask Separation* (repo `surgical-posttraining-diffing`, PDF `paper/surgical-posttraining-diffing-ali-uyar.pdf`). Every number the figure shows lives in `data.mjs`; the readout, the meter, the caption and the legend read them from there.

## The object

An astronomer's blink comparator on a heavy bench on four feet. Two lamp houses with diffuser glass each carry a photographic plate under spring clips: plate A (front) is Gemma 3 4B PT, plate B (back) is Gemma 3 4B IT, both exposed under the one neutral template. A pillar holds a mirror box with two arms and two objectives, one over each plate, and an eyepiece on top. A crank on the side drives a rocker through a link; the rocker turns the mirror, and a cam with a spring detent holds it at either dwell, so the eyepiece shows plate A, then plate B, then A again: the blink. A star only one plate has comes and goes; that flicker is the PT-to-IT difference. A slide runs in guide rails over plate A with three frames: empty, the FullDelta film (two code bands, mid layer behind and late layer in front, and marks in the picture field), and the CapMask film (both bands masked off, five holes in the late band). A flap pivoted on the bar after the FullDelta frame swings over part of its late band; FullDelta with the flap in is FullDelta − VMask. Sliding a frame over plate A is adding that decoded difference back into the PT forward pass. Laid in register over plate A, the FullDelta film masks two of A's extra stars and prints one of B's, so three of the ten differing stars stop flickering; CapMask stills none. A control unit, cabled to the pillar and to both lamp houses, carries the meter that reads answer-token KL to IT on the 600 test prompts (1.256 empty, 0.901 FullDelta, 1.255 CapMask, 0.903 with the flap in), a green and a red register lamp, a lamp switch and a dimmer. Stage A sits on X and Y micrometer screws (stage B is the fixed reference). Turned off register, the green lamp goes out, the red one lights and the needle drops onto its stop pin in the dead sector, because a comparison only means something when both plates are read on the same answer tokens. A slotted rack at the back holds the three matched baseline inserts, a plate box sits at the front, and the bench carries the AU-9 label plate and a ruler strip.

## Quantities

| Quantity | Value | Where it shows | Source |
|---|---|---|---|
| Model pair | Gemma 3 4B PT (plate A), Gemma 3 4B IT (plate B) | plates, legend, readout line 1, caption | Abstract; Sec 2.1 |
| Shared template | `Instruction:\n{prompt}\n\nResponse:\n` | legend ("one neutral template"), caption | Sec 2.1 |
| Test split | 600 prompts, 6 slices × 100 | readout "n 600", meter legend, caption | Sec 2.1 |
| Surrogate layers | mid L16, late L28 | the two code bands on each film, readout "L16, L28", legend | Sec 2.2 ("a mid layer and a late layer"); indices from `configs/delta_module.yaml` (`layer_index: 16`, `layer_index: 28`) |
| Intervention | h′ = h_PT + α_l Δ̂ (decoded delta added to the PT pass) | the slide lays the film over plate A; caption | Sec 2.2 |
| CapMask size | 5 features, on the late layer | 5 holes in the late band of the CapMask film, readout "5 features", caption | Abstract; Sec 1; Sec 5 ("the locked 5-feature capability mask"); Sec 6 (both selected masks on the late layer) |
| VMask | a subtraction mask from FullDelta, on the late layer | the flap swung over the FullDelta film's late band | Sec 2.3 ("used only as a subtraction mask from FullDelta"); Sec 6 |
| KL ans→IT, PT | 1.256 | meter, readout (empty frame) | Table 1 |
| KL ans→IT, FullDelta | 0.901 (−28.3% vs PT) | meter, readout, caption | Table 1; Abstract; Sec 4.1 |
| KL ans→IT, CapMask | 1.255 | meter, readout, caption | Table 1 |
| KL ans→IT, FullDelta − VMask | 0.903 | meter, readout, caption | Table 1 |
| KL ans→IT, IT | 0 (target) | the meter's zero mark | Table 1 |
| Cap (PT / FullDelta / CapMask / −VMask) | 0.000 / 0.070 / 0.000 / 0.070 | readout line 3, caption ("from 0 to 0.070") | Table 1; Abstract |
| Cap gain, FullDelta vs PT | +0.070, 95% CI [0.043, 0.098] | readout line 3 for FullDelta | Table 2 (10,000 paired prompt-level bootstrap resamples) |
| CapRec | 0.000 / 0.186 / 0.000 / 0.186 (IT 1.000) | readout line 3, caption ("0.186 of the PT-to-IT gap") | Table 1; Abstract |
| Mean length, tokens | 47.38 / 16.65 / 47.38 / 17.84 (IT 11.92) | readout line 4, caption | Table 1; Table 2 (FullDelta vs PT Len −30.737 [−32.426, −29.025]) |
| VerbCarry | 0.000 / 0.923 / 0.000 / 0.886 | readout line 4 | Table 1; Abstract |
| Matched baselines | MeanDiff 1.251, RandomMask 1.254, ActivationMassMask 1.255 (KL ans→IT; Cap 0.000 each) | the three cards in the rack, named in the legend; not inserted, not read out | Sec 3 (a mean-delta intervention, a size-matched random mask, a size-matched activation-mass mask); Table 1 |
| Meter scale | 0 to 1.5 over 270°, majors every 0.5, minors every 0.05; stop pin mid dead sector, 45° before zero | dial | drawn to hold the largest reading, 1.256 |

## Drawn, not data

- The star fields are seeded marks: 13 on both plates, 6 only on A, 4 only on B. The FullDelta film stills 3 of the 10 differences (2 masked, 1 printed). That share is drawn to sit near the 28.3% KL drop; it is not a measured count of features. The film's marks sit on the film, about 6 units above the emulsion, so in this view they appear a little up-screen of the stars they cover; the stilled stars are the ones that stop flickering.
- Each code band carries 7 seeded active-code dots. They stand for sparse codes, not for the TopK k = 16 (`configs/delta_module.yaml`), which the figure does not draw.
- The flap covers the last 2 of the 7 late-band dots. The paper does not state VMask's size in the text; its selector cap is 16 (`configs/selectors.yaml`).
- The positions of the five CapMask holes along the late band are drawn.
- Register is the figure's way to say that both forward passes are read teacher-forced on the same IT completion's answer tokens under the same template (Sec 2.1). The off-register travel of stage A (3 and 2 units), the half turn of the thimble per unit and the stop pin's place are drawn.
- The meter reads whenever the plates are registered, blinking or held; off register the needle falls onto the stop pin, so a low reading is never confused with no reading.
- The blink rate (one A-B-A cycle every 2.6 s), the slide's travel, the flap's swing and the needle's spring are motion design. The plate box, rack, ruler strip, lamp switch and dimmer are bench furniture with no data.
