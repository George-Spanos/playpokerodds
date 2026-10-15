// Static build: copy index.html, src/, favicon into dist/. No compile step.
import { cpSync, rmSync, mkdirSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
cpSync('src', 'dist/src', { recursive: true });
console.log('built dist/');
