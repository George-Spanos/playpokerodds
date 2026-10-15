// Home redirects to play (zero friction to play — principle 2).

import { navigate } from '../router.js';

export function render(outlet) {
  navigate('/play');
}
