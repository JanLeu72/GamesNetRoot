const esbuild = require('../../node_modules/esbuild');
esbuild.buildSync({
  stdin: { contents: "import { createBrickBreakerGame } from './src/app/games/brick-breaker/brick-breaker-scene'; createBrickBreakerGame(document.querySelector('canvas'), {level:4, rows:5, columns:12, lives:3, layout:Array(5).fill('#####..#####')}, () => 0, status => document.body.dataset.bricks = status.remaining);", resolveDir: process.cwd() },
  bundle: true, outfile: '.angular/brick-breaker-preview/preview.js'
});
