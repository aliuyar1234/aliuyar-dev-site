# Fig 10 · ProbeRoute · truth table

Paper: *ProbeRoute: Probes as Routing Priors for Frozen-Backbone Multi-Token Prediction*. Every number the figure
shows lives in `data.mjs` and comes from the paper as listed here.

## The object

A cord switchboard on a bench. The jack field has sixteen columns, one per layer of the frozen Pythia-1B, and four
rows, one per prediction horizon h = 1…4, with a lamp over every jack and a head column (one output jack per horizon
head) behind a divider. The probe key (or a click on the field) runs the probe pass: a sweep across the columns lights
each lamp to its layer's probe top-1 for that horizon, so the bright band visibly moves to earlier layers as h grows.
The cords are the sparse router's support: each horizon head owns four seats and patches its m = 4 cords into the
layers its trained router reads. Each cord is held taut by a counterweight under the shelf and runs from the plug's
strain relief through one bend and a straight run to its seat cup; a cord in flight that would pass through a plug standing in another seat rides
over that plug's tip. The counter shows training tokens, the shelf lamp in front of each seat shows the learned router
weight on that cord once the final 50M probe-init run has trained (the only run whose weights the paper reports), and
the head lamp lights when the head is fully patched, or in dense mode when its comb is home. The dense/sparse key pulls
every cord and brings the four comb bars down from their tray on the cabinet cap: each bar is a multiple of seventeen
ganged plugs that goes into every layer's jack in its row and into the head's jack, which is the dense weighted
hidden-state baseline (Dense WHS: a softmax over all 16 layers, `dense_whs` in `src/models/router.py`). In dense mode
the init key springs back, since the dense finalist is the probe-init run. The init key swaps the cords for an
illustrative random support and trains it for the 20M-token ablation; switching back patches the final support and
trains it for 50M. What moves means: lamps = what the offline probes found, cords = which layers the router reads,
combs = every layer mixed, weights and counter = cord drawn and tokens trained, readout = the paper's held-out
metrics for the configuration on the board.

## Quantities

| Quantity | Value | Source |
|---|---|---|
| Backbone, layers | Pythia-1B, 16 layers (columns 0–15) | §4.1; Fig. 2 (1B panel, layer axis 0–15) |
| Horizons | h = 1…4 (rows) | §3.1; Fig. 2, Table 3 |
| Router support size | m = 4 cords per head | §3.3 ("m = 4 in all main sparse runs") |
| Cords: the final router's support per head | h1 {11, 12, 13, 14}, h2 {9, 10, 12, 13}, h3 {7, 9, 12, 13}, h4 {7, 8, 9, 13} | Fig. 2 caption (the layers the final 1B sparse router selects) |
| Best probe layer per horizon | 13 / 10 / 9 / 9 | Table 3 (1B) |
| Best probe top-1 | 18.39 / 10.54 / 6.97 / 5.82 % | Table 3 (1B) |
| Lamp levels (probe top-1 per layer and horizon) | 64 values, e.g. h1 L13 18.39 %, h2 L10 10.55 % | Fig. 2 centre (1B heatmap), read off the colour scale and calibrated on Table 3: top-1 = 4.165 + 14.252 · f, within 0.06 pp of every Table 3 entry |
| Shelf lamps (learned router weight on each cord) | e.g. h1: L12 0.355, L13 0.307, L11 0.173, L14 0.164 | Fig. 2 right (average learned router weights, final 1B sparse model), read off the colour scale; each head sums to about 1 |
| Final run budget | 50M training tokens | §4.1 ("Final 1B reruns use 50M / 5M / 5M"); Table 2 |
| Ablation budget | 20M training tokens | §4.1; Table 4 |
| ProbeRoute (sparse, probe-init), final | top-1 h2–4 0.1172 · accept len 1.1188 · NLL h1–4 5.3780 | Table 2 |
| Dense finalist (Dense WHS, probe-init), final | top-1 h2–4 0.1162 · accept len 1.1110 · NLL h1–4 5.3769 | Table 2; Table 1 note (strongest selected dense baseline, the final comparator) |
| Sparse probe-init vs random-init, 20M | top-1 h2–4 0.1061 vs 0.1037 | Table 4 |

"accept len" is the paper's `mean_accept_len`, the mean accepted-prefix length of the speculative draft proxy.

## What the readout says, by state

| Board state | Context line | Value line |
|---|---|---|
| Idle | frozen Pythia-1B | 16 layers × h 1–4 |
| Probe pass running / done | offline future-token probes / best probe layer, h 1–4 | the column being swept / peaks at layer 13 / 10 / 9 / 9 (Table 3) |
| Patching, final support | final router support (Fig. 2) | patch h=N · S = {the head's four layers} |
| Patching, random-init | random init, illustrative draw | patch h=N · S = {the drawn layers} |
| Pulling a head | sparse router | pull h=N · 4 cords to their seats |
| Combs moving | dense WHS baseline | comb h=N · all 16 layers to the head, or comb h=N back to the tray |
| Training | the configuration on the board | router training · 50M or 20M tokens |
| Final | ProbeRoute m=4, 50M tokens · NLL h1–4 5.3780 | top-1 h2–4 0.1172 · accept len 1.1188 (Table 2) |
| Dense | dense WHS, 50M tokens · NLL h1–4 5.3769 | top-1 h2–4 0.1162 · accept len 1.1110 (Table 2) |
| Random-init | sparse m=4, random init · 20M tokens | top-1 h2–4 0.1037 vs probe-init 0.1061 (Table 4) |
| Listening on head N | the head's cords (prefixed "illustrative draw" when they are a random draw), or all 16 layers bussed | h=N · peak L(best layer) (best top-1) % (Table 3) |

## Inferences and what the paper does not give

- The probe prior initialises the router from probe-derived top-5 z-scores (§3.3; the `probe_zscore_top5` init in
  `src/models/router.py`; Table 6). The paper does not tabulate those top-5 scores, so the board never shows the
  prior's own top-4: the cords are always labelled as the final router's support from the Fig. 2 caption. The lamps
  show top-1, which is a different score, so a cord need not sit under the four brightest lamps of its row.
- The Fig. 2 caption lists each head's layers in an order that matches the learned weights read from the router
  panel, and the repo's router analysis lists `selected_layers_by_horizon` as `torch.topk` of the weights, which
  sorts by weight (`src/models/router.py`); nothing on the board depends on the order (the cords take their
  head's layers in x order).
- The paper does not report the supports of the 20M screening runs, so the board shows no support for a 20M
  probe-init run and the probe-init 20M number appears only beside the random-init result.
- Lamp brightness is probe top-1 scaled within each horizon (min to max of the row, then 0.08 + 0.92 · n², so the
  peak of every row is equally bright); the legend says so. Absolute values are in the listening readout.

## Not data

- The random supports the board patches in random-init mode are three illustrative draws of four distinct layers per
  head, written into `model.mjs`. The paper does not list its random supports; the readout for that mode is the
  paper's random-init result.
- Mechanical sizes and timings are drawing choices with no meaning beyond the mapping above: jack pitch, cup
  positions, cord radius and bend, the ride over stowed plugs, the eight-fall tackle that lifts each weight by an
  eighth of the cord drawn, the cord flight time (1.1 s) and the stagger between a head's cords (0.22 s), the comb
  trips and their 0.7 s stagger, the 2.2 s training sweep.
