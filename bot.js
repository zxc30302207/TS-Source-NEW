#!/usr/bin/env node

const { startBot } = require('./src/app');

startBot().catch((error) => {
  console.error('❌ Bot 啟動失敗:', error);
  process.exitCode = 1;
});

