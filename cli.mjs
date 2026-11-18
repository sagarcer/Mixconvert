#!/usr/bin/env node
// Uso: node cli.mjs escena.scn [salida.snap] [--plantilla base.snap] [--locales-a-aes50a] [--modelo WING|RACK|COMPACT]
import { readFileSync, writeFileSync } from 'node:fs';
import { convert } from './src/convert.js';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const flag = (name) => { const i = args.indexOf(name); if (i >= 0) { args.splice(i, 1); return true; } return false; };
const template = opt('--plantilla');
const wingModel = opt('--modelo') || 'WING';
const localTarget = flag('--locales-a-aes50a') ? 'A' : 'LCL';
const [input, output] = args;
if (!input) { console.error('Uso: node cli.mjs escena.scn [salida.snap] [--plantilla base.snap] [--locales-a-aes50a] [--modelo WING|RACK|COMPACT]'); process.exit(1); }

const res = convert(readFileSync(input, 'utf8'), { options: { wingModel, localTarget, template: template && readFileSync(template, 'utf8') } });
const out = output || input.replace(/\.[^.]+$/, '') + res.extension;
writeFileSync(out, res.output);
console.log(`${res.mix.meta.console} "${res.mix.meta.name}" → ${out}`);
for (const w of res.warnings) console.log('  ⚠ ' + w);
