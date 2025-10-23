// 將 Node.js 與 Discord 生命週期事件集中管理，方便日誌追蹤。
function registerProcessHandlers(client, options) {
  const {
    getSafeErrorMessage,
    localizeError
  } = options;

  process.once('unhandledRejection', (error) => {
    console.error('❌ 未處理的 Promise 拋出：', getSafeErrorMessage(error));
  });

  process.once('uncaughtException', (error) => {
    console.error('⚠️ 捕獲未處理例外：', getSafeErrorMessage(error));
  });

  process.on('rejectionHandled', () => {
    console.warn('🧯 Promise 先 unhandled 再 handled，可能存在記憶體洩漏');
  });

  process.on('beforeExit', (code) => {
    console.log(`👋 程式即將結束（代碼 ${code}）`);
  });

  process.on('exit', (code) => {
    console.log(`🧹 Node.js 進程結束：${code}`);
  });

  process.once('warning', (warning) => {
    console.warn(`ℹ️ Node.js 警告：${warning.name} - ${localizeError(warning.message)}`);
  });

  client.once('error', (error) => {
    console.error('⚠️ 機器人錯誤：', getSafeErrorMessage(error));
  });

  if (client?.ws) {
    client.ws.once('error', (error) => {
      console.error('🤝 WebSocketShard 錯誤：', getSafeErrorMessage(error));
    });
  }
}

module.exports = registerProcessHandlers;
