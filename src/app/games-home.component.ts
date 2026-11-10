import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-games-home',
  imports: [RouterLink],
  template: `
    <h1 class="text-2xl font-semibold">NetRoot Games - Phaser</h1>
    <a
      routerLink="/games/brick-breaker"
      class="mt-5 block max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-cyan-500 focus-visible:outline-2 focus-visible:outline-cyan-700"
    >
      <span class="text-xs font-semibold tracking-widest text-sky-800 uppercase"
        >Arcade · Level 1</span
      >
      <h2 class="mt-1 text-xl font-semibold">Brick Breaker</h2>
      <p class="mt-1 text-sm text-slate-600">
        Lenke den Ball mit dem Schläger und räume alle Steine ab.
      </p>
      <span class="mt-4 inline-block font-semibold text-sky-800">Jetzt spielen →</span>
    </a>
  `,
})
export class GamesHomeComponent {}
