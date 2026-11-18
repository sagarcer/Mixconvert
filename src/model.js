// Modelo neutro de mesa de mezclas.
// Todos los parsers (X32, M32, ...) producen este modelo y todos los
// writers (Wing, ...) lo consumen. Así añadir una mesa nueva solo
// requiere un parser o un writer, no una combinación por cada par.
//
// Unidades: dB, Hz, ms, pan -100..+100, fader -144 = -inf.
//
// Mix {
//   meta: { console, version, name, notes }
//   channels: Strip[]   (canales de entrada)
//   auxins:   Strip[]   (entradas auxiliares)
//   buses:    Strip[]
//   matrices: Strip[]
//   mains:    Strip[]   ([0] = estéreo L/R, [1] = mono/centro)
//   dcas:     { index, name, color, on, fader }[]
//   warnings: string[]
// }
//
// Strip {
//   index, name, color (clave neutra: 'red','green',...), colorInverted
//   input?:  { group: 'LOCAL'|'AES50A'|'AES50B'|'CARD'|'AUX'|'OTHER', number, gain, phantom }
//   trim, invert
//   hpf?:    { on, freq, slope }
//   gate?:   { on, mode, thr, range, att, hld, rel }
//   comp?:   { on, mode, det, env, thr, ratio, knee, gain, att, hld, rel, mix, auto }
//   eq?:     { on, bands: { type: 'LCUT'|'LSHV'|'PEQ'|'VEQ'|'HSHV'|'HCUT', freq, gain, q }[] }
//   on, fader, pan
//   mainSt, mainMono, monoLevel
//   sends:   { target: 'bus'|'mtx', number, on, level, pan, tap: 'PRE'|'POST'|'GRP'|'IN'|'PREEQ'|'POSTEQ' }[]
//   dcas:    number[]
//   muteGroups: number[]
// }

export const NEG_INF = -144;

export const COLORS = ['off', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];

export function emptyMix() {
  return {
    meta: { console: '', version: '', name: '', notes: '' },
    channels: [], auxins: [], buses: [], matrices: [], mains: [], dcas: [],
    warnings: [],
  };
}

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function warnOnce(mix, msg) {
  if (!mix.warnings.includes(msg)) mix.warnings.push(msg);
}
