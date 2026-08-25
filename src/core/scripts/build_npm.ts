// Builds the Deno sources into a plain npm package (ESM + CJS + .d.ts) and
// vendors the result into every npm consumer in the repo.
//
//   deno task build:npm
//
// The generated ./npm folder is throwaway; the copies under
// src/*/vendor/poker-core are what the consumers install via "file:".
import { build, emptyDir } from 'jsr:@deno/dnt@^0.42.1';

const version = '2.1.3';

const consumers = [
  '../ui/vendor/poker-core',
  '../web-api/vendor/poker-core',
];

await emptyDir('./npm');

await build({
  entryPoints: ['./src/mod.ts'],
  outDir: './npm',
  shims: { deno: false },
  test: false,
  package: {
    name: '@moby-it/poker-core',
    version,
    description: 'Poker odds calculation and round generation.',
    license: 'MIT',
    private: true,
    repository: {
      type: 'git',
      url: 'git+https://github.com/moby-it/playpokerodds.git',
      directory: 'src/core',
    },
  },
  postBuild() {
    Deno.copyFileSync('LICENCE', 'npm/LICENCE');
    Deno.copyFileSync('README.md', 'npm/README.md');
    // dnt omits the "types" conditions; without them the package only resolves
    // under the legacy "node" moduleResolution.
    const pkgPath = 'npm/package.json';
    const pkg = JSON.parse(Deno.readTextFileSync(pkgPath));
    pkg.types = './script/mod.d.ts';
    pkg.exports['.'] = {
      import: { types: './esm/mod.d.ts', default: './esm/mod.js' },
      require: { types: './script/mod.d.ts', default: './script/mod.js' },
    };
    Deno.writeTextFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  },
});

// dnt runs `npm install` inside ./npm; none of that belongs in the vendored copy.
const skip = new Set(['node_modules', 'package-lock.json']);

function copyDir(from: string, to: string) {
  Deno.mkdirSync(to, { recursive: true });
  for (const entry of Deno.readDirSync(from)) {
    if (skip.has(entry.name)) continue;
    const src = `${from}/${entry.name}`;
    const dest = `${to}/${entry.name}`;
    if (entry.isDirectory) copyDir(src, dest);
    else Deno.copyFileSync(src, dest);
  }
}

for (const consumer of consumers) {
  try {
    Deno.removeSync(consumer, { recursive: true });
  } catch (e) {
    if (!(e instanceof Deno.errors.NotFound)) throw e;
  }
  copyDir('./npm', consumer);
  console.log(`vendored -> ${consumer}`);
}
