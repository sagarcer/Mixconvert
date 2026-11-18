# MixConvert

Conversor de escenas entre mesas de mezclas digitales. Primera versión:
**Behringer X32 / Midas M32 (`.scn`) → Behringer WING (`.snap`)**.

## Uso

**Web** (recomendado): sirve la carpeta y abre `http://localhost:8080`.
Todo se procesa en el navegador; no se sube nada.

```bash
npm start
```

**Línea de comandos:**

```bash
node cli.mjs escena.scn salida.snap --plantilla mi-wing.snap --modelo RACK --locales-a-aes50a
```

**Tests:** `npm test`

## Recomendación: usa una plantilla

Exporta un snapshot de tu propia Wing (aunque esté vacío) y pásalo como plantilla.
El conversor conserva todo lo de la plantilla (FX, routing de salidas, ajustes
globales, cabecera del fichero) y solo sustituye los parámetros convertidos. Sin
plantilla se genera únicamente la sección `ae_data`, que puede no cargar en todos
los firmwares.

## Qué se convierte

| X32 / M32 | WING |
|---|---|
| Canales 1–32, Aux In 1–8 | Canales 1–32, Aux 1–8 |
| Buses 1–16, Matrices 1–6 | Buses 1–16, Matrices 1–6 |
| Main L/R, Mono | Main 1, Main 2 |
| DCA 1–8 | DCA 1–8 (asignación vía tags `#D1`…) |
| Nombre, color | Nombre, color (paleta aproximada) |
| Patch de entrada (`/config/routing/IN`) + previos | `in/conn` + `io/in/<grupo>/<n>` (ganancia, phantom) |
| Trim, fase, HPF (frec. y pendiente) | `in/set`, `flt/lc*` |
| Gate (EXP2/3/4, GATE, DUCK) | Gate WING (ratio 1:2/1:3/1:4/gate, DUCK) |
| Compresor (COMP/EXP) | Dinámica WING COMP/EXP (ratio redondeado) |
| EQ 4 bandas (canal) / 6 bandas (bus) | EQ STD: L,1,2,H / L,1,2,3,4,H |
| Fader, pan, mute, L/R, mono | `fdr`, `pan`, `mute`, `main/1`, `main/2` |
| Envíos a buses y matrices | `send/1..16`, `send/MX1..8` |

**No se convierte** (la app lo avisa): efectos y sus retornos, routing de salidas,
grupos de mute, iconos, enlaces estéreo, bandas LCut/VEQ (se aproximan).

## Arquitectura

```
src/model.js           modelo neutro (unidades reales: dB, Hz, ms)
src/parsers/x32.js     .scn X32/M32 → modelo
src/writers/wing.js    modelo → .snap WING
src/convert.js         registro de parsers/writers
index.html             interfaz web
cli.mjs                línea de comandos
```

Para añadir otra mesa basta con escribir un parser (origen) o un writer (destino)
y registrarlo en `src/convert.js`; no hace falta un conversor por cada pareja.

## Fuentes

- *WING Remote Protocols* v3.0.5, Patrick-Gilles Maillot (estructura JSON de los snapshots).
- Mapa de propiedades de [libwing](https://crates.io/crates/libwing) (rangos y enumeraciones).
- Formato `.scn` de X32/M32 según la documentación OSC de P.-G. Maillot.
