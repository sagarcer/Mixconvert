// Parser de escenas Behringer X32 / Midas M32 (.scn).
// Ambas mesas comparten firmware y formato: un fichero de texto con una
// cabecera "#x.y#" y una línea por nodo OSC, p. ej.:
//   /ch/01/config "Kick" 1 RD 1
//   /ch/01/eq/1 PEQ 124.7 +0.00 2.0

import { emptyMix, NEG_INF, warnOnce } from '../model.js';

const COLOR_CODES = { OFF: 'off', RD: 'red', GN: 'green', YE: 'yellow', BL: 'blue', MG: 'magenta', CY: 'cyan', WH: 'white' };
const EQ_TYPES = { LCUT: 'LCUT', LSHV: 'LSHV', PEQ: 'PEQ', VEQ: 'VEQ', HSHV: 'HSHV', HCUT: 'HCUT' };
// Tipos de envío: IN, <-EQ (pre-EQ), EQ-> (post-EQ), PRE, POST, GRP.
const SEND_TAPS = { IN: 'IN', '<-EQ': 'PREEQ', 'EQ->': 'POSTEQ', PRE: 'PRE', POST: 'POST', GRP: 'GRP' };

// Divide una línea respetando las cadenas entre comillas.
export function tokenize(line) {
  const out = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(line))) out.push(m[1] !== undefined ? m[1] : m[2]);
  return out;
}

function num(s, fallback = 0) {
  if (s === undefined) return fallback;
  const t = String(s).trim();
  if (/^-?(inf|oo)$/i.test(t)) return NEG_INF;
  // Frecuencias con "k" como separador decimal: 3k55 = 3550 Hz, 1k00 = 1000 Hz.
  const k = t.match(/^(\d+)k(\d*)$/i);
  if (k) return parseFloat(`${k[1]}.${k[2] || 0}`) * 1000;
  const v = parseFloat(t.replace(/k$/i, 'e3'));
  return Number.isFinite(v) ? v : fallback;
}
const on = (s) => String(s).toUpperCase() === 'ON';

function parseColor(code) {
  const c = String(code || 'OFF').toUpperCase();
  const inverted = c.endsWith('I') && c !== 'OFF' && c.length === 3;
  const base = inverted ? c.slice(0, 2) : c;
  return { color: COLOR_CODES[base] || 'off', colorInverted: inverted };
}

// Bits "%00000101" -> [1, 3] (el bit de la derecha es el grupo 1).
function bits(s) {
  const str = String(s || '').replace(/^%/, '');
  const res = [];
  for (let i = 0; i < str.length; i++) if (str[str.length - 1 - i] === '1') res.push(i + 1);
  return res;
}

function strip(index) {
  return {
    index, name: '', color: 'off', colorInverted: false,
    trim: 0, invert: false,
    on: true, fader: NEG_INF, pan: 0,
    mainSt: false, mainMono: false, monoLevel: NEG_INF,
    sends: [], dcas: [], muteGroups: [],
  };
}

// Las bandas 1 y 6 de buses/matrices admiten filtros de cruce (BU6, BU12,
// BE6, BE12, LR12, LR24...): se tratan como corte bajo/alto.
function eqBand(t, band) {
  const code = String(t[0]).toUpperCase();
  let type = EQ_TYPES[code];
  if (!type) type = /^(BU|BE|LR)\d+$/.test(code) ? (band === 1 ? 'LCUT' : 'HCUT') : 'PEQ';
  return { type, freq: num(t[1], 1000), gain: num(t[2]), q: num(t[3], 2) };
}

// Bloques de /config/routing/IN -> grupo de entrada y primer previo (headamp).
function routingBlock(code) {
  const c = String(code).toUpperCase();
  let m;
  if ((m = c.match(/^AN(\d+)-(\d+)$/))) return { group: 'LOCAL', first: +m[1], headamp: +m[1] - 1 };
  if ((m = c.match(/^A(\d+)-(\d+)$/))) return { group: 'AES50A', first: +m[1], headamp: 32 + +m[1] - 1 };
  if ((m = c.match(/^B(\d+)-(\d+)$/))) return { group: 'AES50B', first: +m[1], headamp: 80 + +m[1] - 1 };
  if ((m = c.match(/^CARD(\d+)-(\d+)$/))) return { group: 'CARD', first: +m[1], headamp: null };
  return { group: 'OTHER', first: 1, headamp: null };
}

export function detect(text) {
  return /^#\d+\.\d+#/.test(text.trimStart()) && /\n\/ch\/\d\d\//.test(text);
}

export function parse(text) {
  const mix = emptyMix();
  const lines = text.split(/\r?\n/);
  const header = tokenize(lines[0] || '');
  mix.meta.version = (header[0] || '').replace(/#/g, '');
  mix.meta.name = header[1] || '';
  mix.meta.notes = header[2] || '';
  mix.meta.console = /M32/i.test(lines[0]) ? 'M32' : 'X32';

  const ch = Array.from({ length: 32 }, (_, i) => strip(i + 1));
  const aux = Array.from({ length: 8 }, (_, i) => strip(i + 1));
  const bus = Array.from({ length: 16 }, (_, i) => strip(i + 1));
  const mtx = Array.from({ length: 6 }, (_, i) => strip(i + 1));
  const mains = [strip(1), strip(2)];
  const dcas = Array.from({ length: 8 }, (_, i) => ({ index: i + 1, name: '', color: 'off', on: true, fader: NEG_INF }));
  const headamps = {};
  const channelSource = {};
  let routingIn = ['AN1-8', 'AN9-16', 'AN17-24', 'AN25-32'];
  const ignored = new Set();

  const targets = { ch, auxin: aux, bus, mtx };

  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    if (!line.startsWith('/')) continue;
    const t = tokenize(line);
    const path = t.shift().split('/').filter(Boolean);

    if (path[0] === 'headamp') { headamps[+path[1]] = { gain: num(t[0]), phantom: on(t[1]) }; continue; }
    if (path[0] === 'config' && path[1] === 'routing' && path[2] === 'IN') { routingIn = t.slice(0, 4); continue; }
    if (path[0] === 'config' && /link$/.test(path[1] || '')) {
      if (t.some(on)) warnOnce(mix, `Hay enlaces estéreo (${path[1]}). La Wing gestiona el estéreo en la fuente: revísalo a mano.`);
      continue;
    }
    if (path[0] === 'dca') {
      const d = dcas[+path[1] - 1];
      if (!d) continue;
      if (path.length === 2) { d.on = on(t[0]); d.fader = num(t[1], NEG_INF); }
      else if (path[2] === 'config') { d.name = t[0] || ''; Object.assign(d, { color: parseColor(t[2]).color }); }
      continue;
    }

    let s;
    let rest;
    if (path[0] === 'main') { s = path[1] === 'st' ? mains[0] : path[1] === 'm' ? mains[1] : null; rest = path.slice(2); }
    else if (targets[path[0]]) { s = targets[path[0]][+path[1] - 1]; rest = path.slice(2); }
    else { if (!['config', '-stat', '-prefs'].includes(path[0])) ignored.add('/' + path[0]); continue; }
    if (!s) continue;
    const kind = path[0];
    const key = rest.join('/');

    if (key === 'config') {
      s.name = t[0] || '';
      Object.assign(s, parseColor(t[2]));
      if ((kind === 'ch' || kind === 'auxin') && t[3] !== undefined) channelSource[`${kind}${s.index}`] = +t[3];
    } else if (key === 'preamp') {
      // Matrices y mains solo tienen inversión de fase: "/mtx/01/preamp OFF".
      if (t.length === 1) { s.invert = on(t[0]); continue; }
      s.trim = num(t[0]); s.invert = on(t[1]);
      if (kind === 'ch') s.hpf = { on: on(t[2]), slope: num(t[3], 12), freq: num(t[4], 80) };
    } else if (key === 'gate') {
      s.gate = { on: on(t[0]), mode: String(t[1] || 'GATE').toUpperCase(), thr: num(t[2], -80), range: num(t[3], 60), att: num(t[4], 0), hld: num(t[5], 10), rel: num(t[6], 200) };
    } else if (key === 'dyn') {
      s.comp = {
        on: on(t[0]), mode: String(t[1] || 'COMP').toUpperCase(), det: String(t[2] || 'RMS').toUpperCase(), env: String(t[3] || 'LOG').toUpperCase(),
        thr: num(t[4], 0), ratio: num(t[5], 3), knee: num(t[6], 2), gain: num(t[7]), att: num(t[8], 10), hld: num(t[9], 10), rel: num(t[10], 150),
        // Matrices y mains no tienen keysrc: un campo menos al final.
        mix: num(t.length >= 15 ? t[13] : t[12], 100), auto: on(t.length >= 15 ? t[14] : t[13]),
      };
    } else if (key === 'eq') {
      s.eq = s.eq || { on: false, bands: [] };
      s.eq.on = on(t[0]);
    } else if (/^eq\/\d$/.test(key)) {
      s.eq = s.eq || { on: false, bands: [] };
      s.eq.bands[+rest[1] - 1] = eqBand(t, +rest[1]);
    } else if (key === 'mix') {
      s.on = on(t[0]); s.fader = num(t[1], NEG_INF);
      if (kind === 'mtx' || kind === 'main') { if (kind === 'main') s.pan = num(t[2]); }
      else { s.mainSt = on(t[2]); s.pan = num(t[3]); s.mainMono = on(t[4]); s.monoLevel = num(t[5], NEG_INF); }
    } else if (/^mix\/\d\d$/.test(key)) {
      const n = +rest[1];
      const target = kind === 'ch' || kind === 'auxin' ? 'bus' : 'mtx';
      // Envíos impares: on nivel pan tipo; pares: on nivel (el pan/tipo lo marca el impar).
      const tap = t[3] ? SEND_TAPS[String(t[3]).toUpperCase()] || 'POST' : null;
      s.sends.push({ target, number: n, on: on(t[0]), level: num(t[1], NEG_INF), pan: t[2] !== undefined ? num(t[2]) : 0, tap });
    } else if (key === 'grp') {
      s.dcas = bits(t[0]); s.muteGroups = bits(t[1]);
    } else if (key === 'insert') {
      if (on(t[0])) warnOnce(mix, 'Hay inserciones de FX activas: los efectos no se convierten, asígnalos en la Wing.');
    }
  }

  // Los envíos pares heredan el tipo del impar anterior.
  for (const s of [...ch, ...aux, ...bus, ...mains]) {
    s.sends.sort((a, b) => a.number - b.number);
    s.sends.forEach((snd, i) => { if (!snd.tap) snd.tap = (s.sends[i - 1] && s.sends[i - 1].tap) || 'POST'; });
  }

  // Resolver la fuente física (y su ganancia) de cada canal según el routing.
  const blocks = routingIn.map(routingBlock);
  for (const s of ch) {
    const src = channelSource[`ch${s.index}`] ?? s.index;
    if (src >= 1 && src <= 32) {
      const b = blocks[Math.floor((src - 1) / 8)];
      const offset = (src - 1) % 8;
      const number = b.first + offset;
      const ha = b.headamp !== null ? headamps[b.headamp + offset] : null;
      s.input = { group: b.group, number, gain: ha ? ha.gain : 0, phantom: ha ? ha.phantom : false, hasGain: !!ha };
    } else if (src === 0) {
      s.input = null;
    } else {
      s.input = { group: 'OTHER', number: src, gain: 0, phantom: false, hasGain: false };
      warnOnce(mix, 'Algunos canales usan como fuente aux in, USB o retornos de FX: revisa su patch en la Wing.');
    }
  }

  if (ignored.size) warnOnce(mix, `Secciones no convertidas: ${[...ignored].sort().join(', ')}.`);

  Object.assign(mix, { channels: ch, auxins: aux, buses: bus, matrices: mtx, mains, dcas });
  return mix;
}

export default { id: 'x32', label: 'Behringer X32 / Midas M32 (.scn)', extensions: ['.scn'], detect, parse };
