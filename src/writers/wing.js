// Generador de snapshots Behringer WING (.snap, JSON).
// Nombres de parámetros y rangos tomados de "WING Remote Protocols"
// (P.-G. Maillot, v3.0.5) y del mapa de propiedades de libwing.
//
// Dos modos:
//  - Con plantilla (recomendado): se parte de un .snap exportado de la propia
//    Wing y solo se sobrescriben los parámetros convertidos.
//  - Sin plantilla: se genera solo la sección ae_data con valores por defecto
//    para los canales/buses tocados.

import { clamp, NEG_INF, warnOnce } from '../model.js';

// Paleta WING: 1 gris azulado, 2 azul medio, 3 azul oscuro, 4 turquesa, 5 verde,
// 6 verde oliva, 7 amarillo, 8 naranja, 9 rojo, 10 coral, 11 rosa, 12 malva.
const COLOR = { off: 1, red: 9, green: 5, yellow: 7, blue: 2, magenta: 11, cyan: 4, white: 1 };
const RATIOS = [1.1, 1.2, 1.3, 1.5, 1.7, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 20, 50, 100];
const GATE_RATIO = { EXP2: '1:2', EXP3: '1:3', EXP4: '1:4', GATE: 'gate' };
const INPUT_GROUP = { AES50A: 'A', AES50B: 'B', CARD: 'CRD' };

const r = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const fader = (v) => (v <= -90 ? NEG_INF : r(clamp(v, -144, 10)));
const nearest = (list, v) => list.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));

function clampWarn(mix, v, min, max, what) {
  if (v < min || v > max) warnOnce(mix, `${what} fuera del rango de la Wing (${min}..${max}); se ha ajustado al límite.`);
  return clamp(v, min, max);
}

// ---------- valores por defecto (snapshot tras reset, doc v3.0.5) ----------

function eqDefaults(bandsMid) {
  const eq = { on: false, mdl: 'STD', mix: 100, lg: 0, lf: 80.2, lq: 1, leq: 'SHV' };
  const freqs = bandsMid === 4 ? [200, 601.4, 1499.8, 3990.5] : [125, 250, 500, 1000, 2000, 4000];
  freqs.forEach((f, i) => Object.assign(eq, { [`${i + 1}g`]: 0, [`${i + 1}f`]: f, [`${i + 1}q`]: 1 }));
  return Object.assign(eq, { hg: 0, hf: 12000, hq: 1, heq: 'SHV' });
}
const dynDefaults = () => ({ on: false, mdl: 'COMP', mix: 100, gain: 0, thr: -10, ratio: 3, knee: 3, det: 'RMS', att: 50, hld: 20, rel: 152.6, env: 'LOG', auto: true });
const sendDefaults = (isCh) => (isCh
  ? { on: false, lvl: NEG_INF, pon: false, ind: false, mode: 'PRE', plink: false, pan: 0 }
  : { on: false, lvl: NEG_INF, pre: false });
function sendsDefaults(isCh, buses) {
  const s = {};
  for (let i = 1; i <= buses; i++) s[i] = sendDefaults(isCh);
  for (let i = 1; i <= 8; i++) s[`MX${i}`] = sendDefaults(isCh);
  return s;
}
const mainsDefaults = (onByDefault) => Object.fromEntries([1, 2, 3, 4].map((i) => [i, { on: onByDefault && i === 1, lvl: 0, pre: false }]));

const DEFAULTS = {
  ch: () => ({
    in: { set: { srcauto: false, altsrc: false, inv: false, trim: 0, bal: 0, dlymode: 'M', dly: 0.1, dlyon: false }, conn: { grp: 'LCL', in: 1, altgrp: 'OFF', altin: 1 } },
    flt: { lc: false, lcf: 100.2, lcs: '12', hc: false, hcf: 10018.3, hcs: '6', tf: false, mdl: 'TILT', tilt: 0 },
    clink: true, col: 1, name: '', icon: 0, led: true, mute: false, fdr: NEG_INF, pan: 0, wid: 100,
    solosafe: false, mon: 'A', proc: 'GEDI', ptap: '5',
    gate: { on: false, mdl: 'GATE', thr: -40, range: 40, att: 10, hld: 10, rel: 199.4, acc: 0, ratio: '1:3' },
    eq: eqDefaults(4), dyn: dynDefaults(),
    preins: { on: false, ins: 'NONE' }, main: mainsDefaults(true), send: sendsDefaults(true, 16),
    postins: { on: false, mode: 'FX', ins: 'NONE', w: 0 }, tags: '',
  }),
  bus: () => ({
    in: { set: { inv: false, trim: 0, bal: 0 } },
    col: 10, name: '', icon: 0, led: true, busmono: false, mute: false, fdr: NEG_INF, pan: 0, wid: 100, mon: 'A', busmode: 'PRE',
    eq: eqDefaults(6), dyn: dynDefaults(), preins: { on: false, ins: 'NONE' },
    main: mainsDefaults(false), send: sendsDefaults(false, 16), postins: { on: false, ins: 'NONE' }, tags: '',
  }),
  main: () => ({
    in: { set: { inv: false, trim: 0, bal: 0 } },
    col: 1, name: '', icon: 0, led: true, busmono: false, mute: false, fdr: NEG_INF, pan: 0, wid: 100, mon: 'A',
    eq: eqDefaults(6), dyn: dynDefaults(), preins: { on: false, ins: 'NONE' }, postins: { on: false, ins: 'NONE' }, tags: '',
  }),
  mtx: () => ({
    in: { set: { inv: false, trim: 0, bal: 0 } },
    col: 1, name: '', icon: 0, led: true, busmono: false, mute: false, fdr: NEG_INF, pan: 0, wid: 100, mon: 'A',
    eq: eqDefaults(6), dyn: dynDefaults(), preins: { on: false, ins: 'NONE' }, postins: { on: false, ins: 'NONE' }, tags: '',
  }),
  dca: () => ({ name: '', col: 1, icon: 0, led: false, mute: false, fdr: NEG_INF, mon: 'A' }),
};
DEFAULTS.aux = DEFAULTS.ch;

// ---------- utilidades ----------

export function deepMerge(base, patch) {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) return patch;
  const out = typeof base === 'object' && base !== null && !Array.isArray(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(patch)) out[k] = deepMerge(out[k], v);
  return out;
}

// ---------- conversión de bloques ----------

function convertEq(mix, eq, slots, isInput, strip) {
  const out = { on: !!eq.on, mdl: 'STD' };
  eq.bands.forEach((b, i) => {
    const slot = slots[i];
    if (!b || !slot) return;
    let gain = b.gain;
    let type = b.type;
    if (type === 'LCUT' || type === 'HCUT') {
      if (type === 'HCUT' && isInput && i === eq.bands.length - 1 && b.gain === 0) {
        warnOnce(mix, 'Bandas de EQ "HCut" convertidas al filtro paso-bajo (high cut) de la Wing.');
        strip.flt = { ...(strip.flt || {}), hc: !!eq.on, hcf: r(clamp(b.freq, 50, 20000)) };
      } else {
        warnOnce(mix, 'Bandas de EQ tipo "LCut/HCut" no tienen equivalente directo en la EQ de la Wing: se dejan planas.');
      }
      type = 'PEQ'; gain = 0;
    }
    if (type === 'VEQ') warnOnce(mix, 'Bandas "VEQ" (vintage) convertidas a PEQ: el sonido puede variar ligeramente.');
    const isShelfSlot = slot === 'l' || slot === 'h';
    if ((type === 'LSHV' || type === 'HSHV') && !isShelfSlot) {
      warnOnce(mix, 'Una banda shelving en posición central se ha convertido a PEQ (la Wing solo permite shelving en las bandas L y H).');
      type = 'PEQ';
    }
    out[`${slot}g`] = r(clampWarn(mix, gain, -15, 15, 'Ganancia de EQ'));
    out[`${slot}f`] = r(clamp(b.freq, 20, 20000), 1);
    out[`${slot}q`] = r(clamp(b.q, 0.442, 10), 3);
    if (isShelfSlot) out[`${slot}eq`] = type === 'LSHV' || type === 'HSHV' ? 'SHV' : 'PEQ';
  });
  return out;
}

function convertDyn(mix, c) {
  if (c.ratio && !RATIOS.includes(c.ratio)) warnOnce(mix, 'Algunos ratios de compresor se han redondeado al valor más cercano de la Wing.');
  return {
    on: !!c.on, mdl: c.mode === 'EXP' ? 'EXP' : 'COMP', mix: r(clamp(c.mix, 0, 100)),
    gain: r(clampWarn(mix, c.gain, -6, 12, 'Ganancia de compensación del compresor')),
    thr: r(clamp(c.thr, -60, 0)), ratio: nearest(RATIOS, c.ratio), knee: Math.round(clamp(c.knee, 0, 5)),
    det: c.det === 'PEAK' ? 'PEAK' : 'RMS', env: c.env === 'LIN' ? 'LIN' : 'LOG',
    att: r(clamp(c.att, 0, 120)), hld: r(clamp(c.hld, 1, 200)), rel: r(clamp(c.rel, 4, 4000)), auto: !!c.auto,
  };
}

function convertGate(mix, g) {
  const out = { on: !!g.on, thr: r(clamp(g.thr, -80, 0)), range: r(clamp(g.range, 3, 60)), att: r(clamp(g.att, 0, 120)), hld: r(clamp(g.hld, 1, 200)), rel: r(clamp(g.rel, 4, 4000)) };
  if (g.mode === 'DUCK') out.mdl = 'DUCK';
  else { out.mdl = 'GATE'; out.ratio = GATE_RATIO[g.mode] || 'gate'; }
  return out;
}

function sendMode(mix, tap) {
  if (tap === 'POST') return 'POST';
  if (tap === 'GRP') return 'GRP';
  if (tap !== 'PRE') warnOnce(mix, 'Envíos con punto de toma IN/PRE-EQ/POST-EQ convertidos a PRE: ajusta el punto de toma del bus en la Wing.');
  return 'PRE';
}

function convertStrip(mix, s, kind, slots) {
  const isInput = kind === 'ch' || kind === 'aux';
  const o = { name: (s.name || '').slice(0, 16), col: COLOR[s.color] || 1, icon: 0, mute: !s.on, fdr: fader(s.fader) };
  if (kind !== 'mtx') o.pan = r(clamp(s.pan, -100, 100));
  if (s.trim || s.invert) {
    o.in = { set: { inv: !!s.invert, trim: r(clampWarn(mix, s.trim, -18, 18, 'Trim')) } };
  } else if (isInput || kind === 'bus') o.in = { set: { inv: !!s.invert, trim: 0 } };
  if (s.hpf) o.flt = { lc: !!s.hpf.on, lcf: r(clamp(s.hpf.freq, 20, 2000), 1), lcs: String(nearest([6, 12, 18, 24], s.hpf.slope)) };
  if (s.gate && isInput) o.gate = convertGate(mix, s.gate);
  if (s.comp) o.dyn = convertDyn(mix, s.comp);
  if (s.eq) o.eq = convertEq(mix, s.eq, slots, isInput, o);
  if (kind === 'ch' || kind === 'aux' || kind === 'bus') {
    o.main = { 1: { on: !!s.mainSt }, 2: { on: !!s.mainMono, lvl: fader(s.monoLevel) } };
    const send = {};
    for (const snd of s.sends) {
      const key = snd.target === 'mtx' ? `MX${snd.number}` : String(snd.number);
      send[key] = isInput
        ? { on: !!snd.on, lvl: fader(snd.level), mode: sendMode(mix, snd.tap), pan: r(clamp(snd.pan, -100, 100)) }
        : { on: !!snd.on, lvl: fader(snd.level), pre: snd.tap !== 'POST' };
    }
    if (Object.keys(send).length) o.send = send;
  }
  if (s.dcas && s.dcas.length) o.tags = s.dcas.map((d) => `#D${d}`).join(',');
  if (s.muteGroups && s.muteGroups.length) warnOnce(mix, 'Los grupos de mute no se convierten automáticamente: reasígnalos en la Wing.');
  if (s.colorInverted) warnOnce(mix, 'Los colores invertidos de la X32/M32 no existen en la Wing: se usa el color normal.');
  return o;
}

// ---------- API ----------

export function write(mix, opts = {}) {
  const options = { localTarget: 'LCL', wingModel: 'WING', ...opts };
  const localCount = options.wingModel === 'WING' ? 8 : 24;
  const ae = { ch: {}, aux: {}, bus: {}, main: {}, mtx: {}, dca: {}, io: { in: {} } };
  const CH_SLOTS = ['l', '1', '2', 'h'];
  const BUS_SLOTS = ['l', '1', '2', '3', '4', 'h'];

  mix.channels.forEach((s) => {
    const o = convertStrip(mix, s, 'ch', CH_SLOTS);
    if (s.input && s.input.group !== 'OTHER') {
      const grp = s.input.group === 'LOCAL' ? options.localTarget : INPUT_GROUP[s.input.group];
      const n = s.input.number;
      if (grp === 'LCL' && n > localCount) {
        warnOnce(mix, `Hay canales con entradas locales por encima de la ${localCount} que la ${options.wingModel} no tiene: reasígnalos (o elige "Entradas locales X32 → AES50 A").`);
      }
      o.in = deepMerge(o.in, { conn: { grp, in: n } });
      const src = { name: o.name, col: o.col };
      if (s.input.hasGain && grp !== 'CRD') {
        const [min, max] = grp === 'LCL' ? [-2.5, 45] : [-3, 45.5];
        src.g = r(clampWarn(mix, s.input.gain, min, max, 'Ganancia de previo'));
        src.vph = !!s.input.phantom;
      }
      ae.io.in[grp] = ae.io.in[grp] || {};
      ae.io.in[grp][n] = deepMerge(ae.io.in[grp][n], src);
    }
    ae.ch[s.index] = o;
  });
  mix.auxins.forEach((s) => { ae.aux[s.index] = convertStrip(mix, s, 'aux', CH_SLOTS); });
  mix.buses.forEach((s) => { ae.bus[s.index] = convertStrip(mix, s, 'bus', BUS_SLOTS); });
  mix.matrices.forEach((s) => { ae.mtx[s.index] = convertStrip(mix, s, 'mtx', BUS_SLOTS); });
  mix.mains.forEach((s, i) => { ae.main[i + 1] = convertStrip(mix, s, 'main', BUS_SLOTS); });
  mix.dcas.forEach((d) => { ae.dca[d.index] = { name: d.name.slice(0, 16), col: COLOR[d.color] || 1, mute: !d.on, fdr: fader(d.fader) }; });

  warnOnce(mix, 'Los iconos de la X32/M32 no coinciden con los de la Wing: se dejan sin icono.');
  warnOnce(mix, 'Los efectos (FX), el routing de salidas y los grupos de mute no se convierten.');

  if (options.template) {
    const tpl = typeof options.template === 'string' ? JSON.parse(options.template) : options.template;
    if (!tpl.ae_data) throw new Error('La plantilla no parece un snapshot de Wing (no tiene "ae_data").');
    const out = deepMerge(tpl, { ae_data: ae });
    if (out.description && typeof out.description === 'object') {
      out.description = { ...out.description, updated: new Date().toISOString().slice(0, 19).replace('T', ' ') };
    }
    return JSON.stringify(out, null, 2);
  }

  warnOnce(mix, 'Generado SIN plantilla: si la Wing no lo carga, exporta un snapshot de tu Wing y úsalo como plantilla.');
  for (const kind of ['ch', 'aux', 'bus', 'main', 'mtx', 'dca']) {
    for (const k of Object.keys(ae[kind])) ae[kind][k] = deepMerge(DEFAULTS[kind](), ae[kind][k]);
  }
  return JSON.stringify({ ae_data: ae }, null, 2);
}

export default { id: 'wing', label: 'Behringer WING (.snap)', extension: '.snap', write };
