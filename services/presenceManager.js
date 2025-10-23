// 定期輪替 Bot 狀態／名稱／橫幅，確保品牌一致並顯示即時資訊。
const fs = require('fs');
const path = require('path');

function startPresenceManager(client, options = {}) {
  const {
    assetsDir = path.join(__dirname, '..', 'assets')
  } = options;

  let toggle = true;
  let usernameFixed = false;
  let avatarFixed = false;
  let bannerFixed = false;

  const updateStatus = async () => {
    try {
      if (!client.isReady()) {
        console.log('[DEBUG] 客戶端尚未準備完成，跳過狀態更新');
        return;
      }

      if (!client.ws || client.ws.status !== 0) {
        console.log('[DEBUG] WebSocket 尚未連線，跳過狀態更新');
        return;
      }

      if (!client.ws.shards || client.ws.shards.size === 0) {
        console.log('[DEBUG] 尚未取得 shard 資訊，跳過狀態更新');
        return;
      }

      const shardCount = client.ws.shards.size;
      const latency = client.ws.ping;
      const serverInstallCount = client.guilds.cache.size;

      const hour = (new Date().getUTCHours() + 8) % 24;
      let statusType = 'online';

      if (hour >= 6 && hour < 12) {
        statusType = 'online';
      } else if (hour >= 12 && hour < 18) {
        statusType = 'idle';
      } else if (hour >= 18 && hour < 6) {
        statusType = 'dnd';
      } else if (hour >= 0 && hour < 6) {
        statusType = 'dnd';
      }

      if (toggle) {
        try {
          await client.user.setPresence({
            activities: [{
              name: `服務中 ${shardCount} shards | 延遲 ${latency}ms`,
              type: 3
            }],
            status: statusType
          });
        } catch (presenceError) {
          console.error('[ERROR] 設定 presence 失敗:', presenceError.message);
          return;
        }
      } else {
        if (!usernameFixed && client.user.username !== 'TSBOT') {
          try {
            await client.user.setUsername('TSBOT');
            console.log('✅ 使用者名稱已校正為 TSBOT');
            usernameFixed = true;
          } catch (err) {
            if (err.code === 50035) {
              console.warn('⚠️ 更名速率受限，稍後重試');
            } else {
              console.error('❌ 設定使用者名稱時發生錯誤:', err);
            }
          }
        }

        if (!avatarFixed) {
          try {
            const avatarPath = path.join(assetsDir, 'icon.png');
            if (fs.existsSync(avatarPath)) {
              // const avatarBuffer = fs.readFileSync(avatarPath);
              // await client.user.setAvatar(avatarBuffer);
              console.log('✅ 已檢查頭像設定');
              avatarFixed = true;
            } else {
              console.warn('⚠️ 找不到頭像檔案:', avatarPath);
              avatarFixed = true;
            }
          } catch (err) {
            console.error('❌ 設定頭像時發生錯誤:', err);
          }
        }

        if (!bannerFixed) {
          try {
            const bannerPath = path.join(assetsDir, 'banner.jpg');
            if (fs.existsSync(bannerPath)) {
              const bannerBuffer = fs.readFileSync(bannerPath);
              await client.user.setBanner(bannerBuffer);
              console.log('✅ 已設定個人檔案橫幅');
              bannerFixed = true;
            } else {
              console.warn('⚠️ 找不到橫幅檔案:', bannerPath);
              bannerFixed = true;
            }
          } catch (err) {
            if (err.code !== 50035) {
              console.error('❌ 設定橫幅時發生錯誤:', err);
            }
          }
        }

        try {
          await client.user.setPresence({
            activities: [{
              name: `服務伺服器數 ${serverInstallCount}`,
              type: 3
            }],
            status: statusType
          });
        } catch (presenceError) {
          console.error('[ERROR] 設定 presence 失敗:', presenceError.message);
        }
      }

      toggle = !toggle;
    } catch (err) {
      console.error('❌ 狀態更新流程發生錯誤:', err);
    }
  };

  client.once('ready', () => {
    setTimeout(() => {
      console.log('[DEBUG] 啟動狀態輪播排程');
      updateStatus();
      setInterval(updateStatus, 10000);
    }, 3000);
  });
}

module.exports = {
  startPresenceManager
};