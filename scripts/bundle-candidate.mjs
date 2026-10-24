import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
// EmDash resolves relative output directories against the plugin directory.
// Use absolute paths so local and clean CI builds produce the same artifact.
execFileSync('npm',['exec','--','emdash-plugin','bundle','--dir',resolve('packages/sandboxed'),'--out-dir',resolve('artifacts')],{stdio:'inherit',shell:false});
