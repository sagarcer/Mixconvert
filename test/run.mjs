import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { convert } from '../src/convert.js';

const scn = readFileSync(new URL('./fixtures/ejemplo.scn', import.meta.url), 'utf8');
let failures = 0;
function t(name, fn) { try { fn(); console.log('ok  ', name); } catch (e) { failures++; console.log('FAIL', name, '\n    ', e.message); } }

const { mix, output, warnings } = convert(scn);
const snap = JSON.parse(output);
const ae = snap.ae_data;
const ch1 = ae.ch['1'];

t('detecta X32', () => assert.equal(mix.meta.console, 'X32'));
t('nombre y color', () => { assert.equal(ch1.name, 'Bombo'); assert.equal(ch1.col, 9); });
t('fader y pan', () => { assert.equal(ch1.fdr, -3.5); assert.equal(ch1.pan, 0); assert.equal(ch1.mute, false); });
t('HPF', () => assert.deepEqual([ch1.flt.lc, ch1.flt.lcf, ch1.flt.lcs], [true, 80, '24']));
t('trim', () => assert.equal(ch1.in.set.trim, 2.5));
t('routing AES50 A + ganancia', () => {
  assert.deepEqual([ch1.in.conn.grp, ch1.in.conn.in], ['A', 1]);
  assert.equal(ae.io.in.A['1'].g, 45.5); assert.equal(ae.io.in.A['1'].vph, true); assert.equal(ae.io.in.A['1'].name, 'Bombo');
});
t('canal 17 en entrada local 17 con ganancia', () => {
  assert.deepEqual([ae.ch['17'].in.conn.grp, ae.ch['17'].in.conn.in], ['LCL', 17]);
  assert.equal(ae.io.in.LCL['17'].g, 30); assert.equal(ae.ch['17'].in.set.inv, true);
});
t('canal 25 en tarjeta, sin ganancia', () => { assert.equal(ae.ch['25'].in.conn.grp, 'CRD'); assert.equal(ae.io.in.CRD['1'].g, undefined); });
t('mute + mono', () => { assert.equal(ae.ch['17'].mute, true); assert.equal(ae.ch['17'].main['2'].on, true); assert.equal(ae.ch['17'].main['2'].lvl, 0); });
t('gate', () => assert.deepEqual(ch1.gate, { acc: 0, on: true, thr: -42, range: 30, att: 2, hld: 50, rel: 180, mdl: 'GATE', ratio: '1:3' }));
t('compresor', () => { assert.equal(ch1.dyn.ratio, 4); assert.equal(ch1.dyn.thr, -18); assert.equal(ch1.dyn.gain, 3); assert.equal(ch1.dyn.det, 'RMS'); });
t('EQ canal', () => {
  assert.equal(ch1.eq.on, true);
  assert.deepEqual([ch1.eq.lg, ch1.eq.lf, ch1.eq.leq], [4, 60, 'SHV']);
  assert.deepEqual([ch1.eq['1g'], ch1.eq['1f'], ch1.eq['1q']], [-6, 380, 3]);
  assert.deepEqual([ch1.eq['2g'], ch1.eq['2f']], [2, 2500]);
  assert.deepEqual([ch1.flt.hc, ch1.flt.hcf], [true, 12000]);
});
t('envíos', () => {
  assert.deepEqual(ch1.send['1'], { ...ch1.send['1'], on: true, lvl: -10, mode: 'PRE' });
  assert.equal(ch1.send['2'].mode, 'PRE');
  assert.deepEqual([ch1.send['3'].on, ch1.send['3'].mode, ch1.send['3'].pan], [false, 'POST', -20]);
});
t('DCA tags', () => assert.equal(ch1.tags, '#D1,#D3'));
t('bus', () => {
  const b = ae.bus['1'];
  assert.deepEqual([b.name, b.col, b.fdr, b.eq['lg'], b.eq.hg, b.eq.heq], ['Mon 1', 4, 0, -3, -2, 'SHV']);
  assert.equal(b.eq.leq, 'PEQ');
  assert.deepEqual(b.send.MX1, { on: true, lvl: -6, pre: false });
});
t('matriz y main', () => { assert.equal(ae.mtx['1'].fdr, -5); assert.equal(ae.main['1'].fdr, -2); assert.equal(ae.main['2'].mute, true); });
t('DCA', () => assert.deepEqual(ae.dca['1'], { ...ae.dca['1'], name: 'Batería', col: 9, fdr: -1.5, mute: false }));
t('avisos', () => {
  assert.ok(warnings.some((w) => w.includes('VEQ')));
  assert.ok(warnings.some((w) => w.includes('/fxrtn')));
  assert.ok(warnings.some((w) => w.includes('SIN plantilla')));
});
t('modo plantilla conserva lo no tocado', () => {
  const tpl = { type: 'x', description: { name: 'Base' }, ae_data: { ch: { 1: { name: 'old', proc: 'EGDI' } }, fx: { 1: { mdl: 'HALL' } } }, ce_data: { a: 1 } };
  const out = JSON.parse(convert(scn, { options: { template: tpl } }).output);
  assert.equal(out.ae_data.ch['1'].name, 'Bombo');
  assert.equal(out.ae_data.ch['1'].proc, 'EGDI');
  assert.equal(out.ae_data.fx['1'].mdl, 'HALL');
  assert.deepEqual(out.ce_data, { a: 1 });
});
t('entradas locales → AES50 A', () => {
  const out = JSON.parse(convert(scn, { options: { localTarget: 'A' } }).output);
  assert.equal(out.ae_data.ch['17'].in.conn.grp, 'A');
});
t('frecuencias 3k55 y tipo EQ->', () => {
  const c = ae.ch['2'];
  assert.equal(c.eq['2f'], 3550); assert.equal(c.eq.hf, 8430);
  assert.equal(c.send['1'].mode, 'PRE'); assert.equal(c.send['2'].lvl, -13); assert.equal(c.send['2'].mode, 'PRE');
  assert.equal(c.send['3'].mode, 'PRE');
});
t('matriz: preamp solo fase, dinámica sin keysrc', () => {
  const m = ae.mtx['2'];
  assert.equal(m.in.set.inv, true); assert.equal(m.dyn.mix, 80); assert.equal(m.dyn.auto, true);
});
t('main → matrices', () => assert.deepEqual(ae.main['1'].send.MX2, { on: true, lvl: -3, pre: false }));
console.log(`\n${warnings.length} avisos:\n - ` + warnings.join('\n - '));
process.exit(failures ? 1 : 0);
