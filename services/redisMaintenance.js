function scheduleRedisCleanup(redisCache, options = {}) {
  const {
    delay = 5000,
    interval = 60 * 60 * 1000,
    pattern = 'temp:*'
  } = options;

  if (!redisCache || typeof redisCache.raw !== 'function') {
    console.warn('[redisMaintenance] 未提供有效的 redisCache 實例，略過排程。');
    return;
  }

  setTimeout(() => {
    setInterval(async () => {
      const client = redisCache.raw();
      if (!client || typeof client.keys !== 'function') {
        console.warn('[redisMaintenance] Redis client 尚未連線，跳過清理。');
        return;
      }

      try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
          console.log(`[redisMaintenance] 已清理 ${pattern} ${keys.length} 筆記錄`);
        }
      } catch (err) {
        console.error('[redisMaintenance] 清理暫存鍵失敗:', err.message);
      }
    }, interval);
  }, delay);
}

module.exports = {
  scheduleRedisCleanup
};
