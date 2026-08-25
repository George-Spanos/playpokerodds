import { AsyncPipe, NgStyle } from '@angular/common';
import { Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { LoaderComponent } from './shared/ui/loader/loader.component';
import { LoaderService } from './shared/ui/loader/loader.service';
import { TopBarComponent } from './top-bar/top-bar.component';

@Component({
  selector: 'ppo-root',
  standalone: true,
  imports: [RouterOutlet, TopBarComponent, LoaderComponent, AsyncPipe, NgStyle],
  template: `
    <section [ngStyle]="rootStyles()">
      <ppo-top-bar></ppo-top-bar>
      <router-outlet></router-outlet>
      @if (loading$ | async) {
        <ppo-loader></ppo-loader>
      }
    </section>
  `,
})
export class AppComponent {
  event = toSignal(this.router.events);
  rootStyles = computed(() => {
    const e = this.event();
    if (e instanceof NavigationEnd && e.url === '/') {
      return {
        background: "url('/assets/home-background.png')",
        'background-size': 'cover',
        minHeight: '100%',
      };
    } else {
      return {
        'background-color': 'var(--neutral--900)',
        'min-height': '100vh',
      };
    }
  });
  constructor(
    private loaderService: LoaderService,
    private router: Router,
  ) {}
  loading$ = this.loaderService.loading$;
}
