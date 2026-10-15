// Static build: copy index.html, src/, favicon into dist/. No compile step.
import { cpSync, rmSync, mkdirSync, copyFileSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
cpSync('index.html', 'dist/index.html');
cpSync('src', 'dist/src', { recursive: true });
copyFileSync('robots.txt', 'dist/robots.txt');
copyFileSync('sitemap.xml', 'dist/sitemap.xml');
console.log('built dist/');
