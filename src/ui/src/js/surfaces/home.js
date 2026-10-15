// Home redirects to play (zero friction to play — principle 2).
import { navigate } from '../router.js';

export function render(outlet) {
  // preserve home metadata; the redirect must not clobber the crawler-visible title
  navigate('/play', { keepMeta: true });
}
