import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'ppo-about',
  template: `
      <section class="container">
        <p>
          PlayPokerOdds is a collaborative idea and effort of Moby IT and
          <a href="https://www.linkedin.com/in/farazbarmpar/" target="_blank"
            >Faraz Barbar</a
          >.</p>
          <p> Icons used are imported from <a href="https://iconoir.com/" target="_blank">iconnoir</a>, an open
          source icon library licenced under MIT.
        </p>
      </section>
      `,
  styles: [`
    :host {
      flex: 1;
      display: flex;
      background-color: var(--neutral--900);
    }
    .container p:first-child {
      margin-top:2rem;
    }
  `],
  standalone: true
})
export class AboutComponent {
  constructor(private router: Router) { }
}
