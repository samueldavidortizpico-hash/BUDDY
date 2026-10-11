/**
 * Textos de la interfaz. Hoy solo español de Colombia; para otro idioma basta con añadir un archivo con la misma
 * forma (`typeof esCO`) y elegirlo aquí según el idioma del dispositivo.
 */
import { esCO } from './es-CO';

export type Strings = typeof esCO;

export const strings: Strings = esCO;
