const path = require('path');
const { Collection } = require('discord.js');

const config = require('../../config');
const setupLogging = require('../core/setupLogging');
const { createClient } = require('../core/createClient');
const registerCommands = require('../core/commandRegistry');
const registerSlashCommands = require('../core/registerSlashCommands');
const registerProcessHandlers = require('../core/registerProcessHandlers');
const registerSystemMonitors = require('../monitoring/registerSystemMonitors');
const registerGuildEvents = require('../events/registerGuildEvents');
const registerMessageHandler = require('../events/registerMessageHandler');
const registerInteractionHandlers = require('../../handlers/registerInteractionHandlers');
const { startPresenceManager } = require('../../services/presenceManager');
const { scheduleRedisCleanup } = require('../../services/redisMaintenance');
const statusCommand = require('../../commands/status');
const redisCache = require('../../utils/redisCache');
const setupErrorHandle = require('../../lib/error');
const { handleAIMessage, saveUserMemory } = require('../../ai/system');
const handleTextCommand = require('../../handlers/handleTextCommand');
const checkBlacklist = require('../../utils/checkBlacklist');
const logEvent = require('../../events/logEvent');
const { privacyEmbed, buttonRow } = require('../../privacyEmbed');
const formatError = require('../../utils/formatError');
const { createErrorTools } = require('../utils/errorUtils');
const { reloadAllModules } = require('../../reloadManager');

class BotApp {
  constructor() {
    if (!config.TOKEN) {
      throw new Error('缺少 TOKEN，請於 .env 或 apikeyconfig.local.json 設定 BOT 憑證');
    }

    // 預先計算會反覆用到的路徑與客製工具，避免每次啟動都重複初始化。
    this.rootDir = path.resolve(__dirname, '..', '..');
    this.client = createClient();
    this.client.commands = new Collection();
    this.logging = setupLogging({ rootDir: this.rootDir });
    this.errorTools = createErrorTools({ localizationPath: path.join(this.rootDir, 'localization.json') });
  }

  async bootstrap() {
    // 確保 hot-reload 場景下不會殘留舊的 require 快取。
    reloadAllModules();

    statusCommand.initRedis({ maxRetries: 10, connectTimeout: 7000 });

    const { slashPayload } = registerCommands(this.client, { rootDir: this.rootDir });

    // 互動處理器需於註冊指令後掛載，才能回應所有按鈕 / 選單。
    registerInteractionHandlers(this.client);

    const { incrementUploadCounter } = registerSystemMonitors(this.client, {});

    registerGuildEvents(this.client, { privacyEmbed, buttonRow, logEvent });

    registerMessageHandler(this.client, {
      config,
      checkBlacklist,
      handleTextCommand,
      handleAIMessage,
      saveUserMemory,
      formatError,
      incrementUploadCounter
    });

    registerProcessHandlers(this.client, this.errorTools);
    setupErrorHandle(this.client);

    startPresenceManager(this.client, { assetsDir: path.join(this.rootDir, 'assets') });
    scheduleRedisCleanup(redisCache);

    this.client.once('ready', async () => {
      console.log(`✅ 已登入為 ${this.client.user.tag}`);

      try {
        await redisCache.connect();
        console.log('✅ Redis 初始化完成');
      } catch (error) {
        console.error('❌ Redis 初始化失敗，緩存功能將停用:', error.message);
      }

      try {
        await registerSlashCommands({
          applicationId: config.CLIENT_ID,
          token: config.TOKEN,
          commands: slashPayload
        });
      } catch (error) {
        console.error('⚠️ 更新全域 Slash 指令失敗:', error);
      }

      const botVersion = String(config.BOT_VERSION || 'V0.0.0').toUpperCase().startsWith('V')
        ? String(config.BOT_VERSION || 'V0.0.0').toUpperCase()
        : `V${String(config.BOT_VERSION || '0.0.0')}`;
      console.log(`🤖 當前版本: ${botVersion}`);
    });

    console.log('✅ 所有初始化作業已完成，正在啟動...');
    await this.client.login(config.TOKEN);
  }

  async start() {
    try {
      await this.bootstrap();
    } catch (error) {
      console.error('❌ 無法啟動 Bot:', error);
      process.exitCode = 1;
    }
  }
}

module.exports = BotApp;
