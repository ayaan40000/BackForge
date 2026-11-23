// One way to show how a move looks: a photo stop-motion (free-exercise-db) when we
// have one, otherwise a drawn animated figure (data/figures.json), otherwise nothing.
import { html } from '../../vendor/htm-preact.mjs';
import { Flip } from './kit.js';
import { Figure, hasFigure } from './figure.js';
import { photosFor } from '../data.js';
export const hasDemo = id => !!photosFor(id) || hasFigure(id);
export function Demo({ id, size = 'md', label }) {
  const ph = photosFor(id);
  if (ph) return html`<${Flip} media=${ph} size=${size} label=${label} />`;
  if (hasFigure(id)) return html`<${Figure} id=${id} size=${size} label=${label} />`;
  return null;
}
