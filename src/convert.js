// Registro de formatos. Para añadir una mesa nueva, crea un parser o un
// writer con la misma interfaz y regístralo aquí.
import x32 from './parsers/x32.js';
import wing from './writers/wing.js';

export const parsers = [x32];
export const writers = [wing];

export function detectParser(text) {
  return parsers.find((p) => p.detect(text)) || null;
}

export function convert(text, { from, to = 'wing', options = {} } = {}) {
  const parser = from ? parsers.find((p) => p.id === from) : detectParser(text);
  if (!parser) throw new Error('No se reconoce el formato del fichero de origen.');
  const writer = writers.find((w) => w.id === to);
  if (!writer) throw new Error(`Destino desconocido: ${to}`);
  const mix = parser.parse(text);
  const output = writer.write(mix, options);
  return { mix, output, extension: writer.extension, warnings: mix.warnings };
}
