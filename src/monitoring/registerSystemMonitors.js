const fs = require('fs');
const os = require('os');
const https = require('https');
const net = require('net');
const asyncHooks = require('async_hooks');
const { performance } = require('perf_hooks');

function registerSystemMonitors(client, options = {}) {
  const {
    certificateHost = 'tsbot.dpdns.org'
  } = options;

  // 記憶體監測
  setInterval(() => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    if (used > 1000) {
      console.warn(`💾 記憶體高使用量：${used.toFixed(1)} MB`);
    }
  }, 30_000);

  // 系統負載
  setInterval(() => {
    const load = os.loadavg()[0];
    if (load > os.cpus().length) {
      console.warn(`🔥 系統負載過高：${load.toFixed(2)}`);
    }
  }, 30_000);

  // 事件迴圈延遲監控 (1 秒)
  setInterval(() => {
    const start = Date.now();
    setImmediate(() => {
      const lag = Date.now() - start;
      if (lag > 1000) {
        console.warn(`🐌 事件迴圈延遲過長：${lag}ms`);
      }
    });
  }, 5_000);

  // 事件迴圈延遲監控 (200ms)
  setInterval(() => {
    const start = performance.now();
    setImmediate(() => {
      const delay = performance.now() - start;
      if (delay > 200) {
        console.warn(`🐢 事件迴圈延遲 ${delay.toFixed(1)}ms，可能存在阻塞程式`);
      }
    });
  }, 10_000);

  // 再次檢查阻塞
  setInterval(() => {
    const start = Date.now();
    setImmediate(() => {
      const delay = Date.now() - start;
      if (delay > 500) {
        console.warn(`🐢 Event Loop 延遲：${delay}ms`);
      }
    });
  }, 10_000);

  // Shard 事件
  client.on('shardDisconnect', (event, id) => {
    console.warn(`🧩 Shard #${id} 斷線：${event.code} ${event.reason || ''}`);
  });
  client.on('shardError', (error, id) => {
    console.error(`🧩 Shard #${id} 錯誤：`, error);
  });
  client.on('shardReady', (id) => {
    console.log(`✅ Shard #${id} 已就緒`);
  });
  client.on('shardReconnecting', (id) => {
    console.warn(`🔁 Shard #${id} 正在重新連線`);
  });
  client.on('shardResume', (id, replayed) => {
    console.log(`▶️ Shard #${id} 已恢復，重播事件數：${replayed}`);
  });

  client.on('disconnect', (event) => {
    console.warn(`📴 Discord 斷線：${event.code} ${event.reason || '未知原因'}`);
  });

  client.on('reconnecting', () => {
    console.log('🔁 正在重新連線至 Discord...');
  });

  client.on('invalidated', () => {
    console.error('🧩 Discord Session 已失效，可能是 Token 被重置或過期');
    process.exit(1);
  });

  if (client.ws) {
    client.ws.on('heartbeat', (latency) => {
      if (latency > 3000) {
        console.warn(`🐢 心跳延遲過高：${latency}ms`);
      }
    });
  }

  // 憑證檢查
  function checkCert(host) {
    const req = https.request({ host, method: 'GET', port: 443, agent: false }, (res) => {
      const cert = res.socket.getPeerCertificate();
      if (cert && cert.valid_to) {
        const days = (new Date(cert.valid_to) - Date.now()) / 86_400000;
        if (days < 14) {
          console.warn(`🔒 ${host} 憑證將到期（${Math.ceil(days)} 天）`);
        }
      }
      res.destroy();
    });
    req.on('error', () => {});
    req.end();
  }

  if (certificateHost) {
    setInterval(() => checkCert(certificateHost), 86_400_000);
  }

  // CPU 監控
  let lastCpu = process.cpuUsage();
  setInterval(() => {
    const current = process.cpuUsage();
    const userDiff = current.user - lastCpu.user;
    const sysDiff = current.system - lastCpu.system;
    lastCpu = current;
    const windowMs = 10_000;
    const cpuMs = (userDiff + sysDiff) / 1000;
    if (cpuMs / windowMs > 0.7) {
      console.warn(`🔥 CPU 占用高：${((cpuMs / windowMs) * 100).toFixed(1)}%`);
    }
  }, 10_000);

  // child_process spawn 監控
  const cp = require('child_process');
  const originalSpawn = cp.spawn;
  const spawnCounter = { count: 0 };
  cp.spawn = function patchedSpawn(...args) {
    spawnCounter.count += 1;
    return originalSpawn.apply(this, args);
  };
  setInterval(() => {
    if (spawnCounter.count > 20) {
      console.warn('⚠️ 短時 spawn 過多', spawnCounter.count);
    }
    spawnCounter.count = 0;
  }, 10_000);

  // 暫存檔案監控
  const tmpDir = os.tmpdir();
  setInterval(() => {
    fs.readdir(tmpDir, (error, files) => {
      if (!error && Array.isArray(files) && files.length > 1000) {
        console.warn(`🗂️ tmp 檔案過多：${files.length}`);
      }
    });
  }, 60_000);

  // async hooks 監控
  let activeHooks = 0;
  const hook = asyncHooks.createHook({
    init() {
      activeHooks += 1;
    },
    destroy() {
      activeHooks -= 1;
    }
  });
  hook.enable();
  setInterval(() => {
    if (activeHooks > 2000) {
      console.warn(`🔗 活躍 async 資源過多：${activeHooks}`);
    }
  }, 15_000);

  // socket 監控
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.listen(0, () => {
    setInterval(() => {
      if (sockets.size > 500) {
        console.warn(`🔌 開啟 socket 過多：${sockets.size}`);
      }
    }, 10_000);
  });

  // Heap 成長監控
  let lastHeap = process.memoryUsage().heapUsed;
  setInterval(() => {
    const current = process.memoryUsage().heapUsed;
    if (current - lastHeap > 20 * 1024 * 1024) {
      console.warn(`📈 Heap 短期增長 >20MB (${((current - lastHeap) / 1024 / 1024).toFixed(1)}MB)`);
    }
    lastHeap = current;
  }, 5_000);

  // native RSS 與 heap 差距
  setInterval(() => {
    const { rss, heapUsed } = process.memoryUsage();
    if (rss - heapUsed > 300 * 1024 * 1024) {
      console.warn('💀 native memory 與 heap 差距大', `${((rss - heapUsed) / 1024 / 1024).toFixed(1)}MB`);
    }
  }, 30_000);

  let uploadCounter = 0;
  setInterval(() => {
    if (uploadCounter > 50) {
      console.warn('📎 上傳次數暴增', uploadCounter);
    }
    uploadCounter = 0;
  }, 10_000);

  return {
    incrementUploadCounter() {
      uploadCounter += 1;
    }
  };
}

module.exports = registerSystemMonitors;

