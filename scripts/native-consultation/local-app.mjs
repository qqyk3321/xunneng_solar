// Start either app with synthetic/local services only. No production credentials.
import { localEnv as env } from './local-env.mjs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const fixture=process.argv[2], port=fixture?'3137':'3136';
const cwd=fixture?resolve(fixture):process.cwd();
const host=process.env.NATIVE_PREVIEW_HOST || '127.0.0.1';
const previewOrigin=process.env.NATIVE_PREVIEW_ORIGIN || env.SITE_URL;
const appEnv={...env,SITE_URL:previewOrigin,CONSULTATION_SITE_URL:process.env.NATIVE_PREVIEW_ORIGIN || env.CONSULTATION_SITE_URL};
const child=spawn(process.execPath,[resolve(cwd,'node_modules/next/dist/bin/next'),'dev','-H',host,'-p',port],{cwd,env:appEnv,stdio:'inherit'});
child.on('exit',code=>process.exit(code||0));
process.on('SIGTERM',()=>child.kill('SIGTERM'));process.on('SIGINT',()=>child.kill('SIGINT'));
