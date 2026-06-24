#!/usr/bin/env node
/**
 * 复制主进程文件到 dist 目录
 *
 * 主进程为纯 JavaScript，无需 TypeScript 编译。
 * 该脚本将 src/main/{index.js,preload.js} 复制到 dist/main/，
 * 保证 dist/main/index.js 与 package.json 的 "main" 字段一致。
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src', 'main');
const OUT_DIR = path.join(__dirname, '..', 'dist', 'main');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const files = fs.readdirSync(SRC_DIR);
let copied = 0;

for (const file of files) {
  const srcPath = path.join(SRC_DIR, file);
  const outPath = path.join(OUT_DIR, file);
  if (fs.statSync(srcPath).isFile()) {
    fs.copyFileSync(srcPath, outPath);
    copied += 1;
    console.log(`[copy-main] ${file} -> dist/main/${file}`);
  }
}

console.log(`[copy-main] done. ${copied} file(s) copied.`);
