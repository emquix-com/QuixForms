import {execFileSync} from 'node:child_process';
import {resolve, dirname, join} from 'node:path';
// EmDash resolves relative output directories against the plugin directory.
// Use absolute paths so local and clean CI builds produce the same artifact.
const npmCli = process.env.npm_execpath ?? join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
execFileSync(process.execPath,[npmCli,'exec','--','emdash-plugin','bundle','--dir',resolve('packages/sandboxed'),'--out-dir',resolve('artifacts')],{stdio:'inherit',shell:false});
