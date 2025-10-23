// 提供錯誤訊息本地化與安全格式化，避免在 Discord 顯示敏感資訊。
const fs = require('fs');
const path = require('path');

// localization.json 由營運維護，缺失時將退回空物件。
function loadLocalizationData(localizationPath = path.resolve(process.cwd(), 'localization.json')) {
  if (!fs.existsSync(localizationPath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(localizationPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[errorUtils] 讀取 localization.json 失敗:', error.message);
    return {};
  }
}

function buildExtraPermissionMessages() {
  return {
    SEND_MESSAGES: (channel) => `❌ 此頻道無發送訊息的權限：[#${channel?.name}] | 伺服器：[${channel?.guild?.name}]`,
    MANAGE_MESSAGES: (channel) => `❌ 此頻道無刪除訊息的權限：[#${channel?.name}] | 伺服器：[${channel?.guild?.name}]`,
    MANAGE_CHANNELS: (guild) => `❌ 此伺服器無創建頻道的權限：[${guild?.name}]`,
    CREATE_INSTANT_INVITE: (guild) => `❌ 此伺服器無建立邀請的權限：[${guild?.name}]`,
    MANAGE_WEBHOOKS: (guild) => `❌ 此伺服器無創建 Webhook 的權限：[${guild?.name}]`,
    VIEW_CHANNEL: (channel) => `❌ 無法查看此頻道：[#${channel?.name}]`,
    EMBED_LINKS: (channel) => `❌ 無法嵌入連結：[#${channel?.name}]`,
    ATTACH_FILES: (channel) => `❌ 無法上傳檔案：[#${channel?.name}]`,
    USE_EXTERNAL_EMOJIS: (channel) => `❌ 無法使用外部表情符號：[#${channel?.name}]`,
    CONNECT: (channel) => `❌ 無法加入語音頻道：[#${channel?.name}] | 伺服器：[${channel?.guild?.name}]`,
    SPEAK: (channel) => `❌ 無法在語音頻道中說話：[#${channel?.name}]`
  };
}

function localizeErrorInternal(message, localizationData) {
  if (!message || typeof message !== 'string') return '未知錯誤';

  const trimmed = message.trim();
  if (trimmed.length === 0) return '未知錯誤';

  const lowerMsg = trimmed.toLowerCase();

  for (const [key, value] of Object.entries(localizationData)) {
    if (key.toLowerCase() === lowerMsg) {
      return value;
    }
  }

  for (const [key, value] of Object.entries(localizationData)) {
    const keyLower = key.toLowerCase();
    if (lowerMsg.includes(keyLower) || lowerMsg.startsWith(keyLower)) {
      return value;
    }
  }

  console.warn(`[errorUtils] 未翻譯錯誤訊息: ${message}`);
  return `（未翻譯）${message}`;
}

// createErrorFormatter 會根據不同錯誤型態組出可讀訊息。
function createErrorFormatter({ localizationData, extraPermissionMessages }) {
  return function getSafeErrorMessage(err, context = {}) {
    try {
      if (!err) return '未知錯誤';

      if (typeof err === 'string') {
        const trimmed = err.trim();
        if (!trimmed) return '未知錯誤';
        if (trimmed.length > 100) {
          return `${localizeErrorInternal(trimmed.slice(0, 100), localizationData)}...（內容過長）`;
        }
        return localizeErrorInternal(trimmed, localizationData);
      }

      if (typeof err === 'object' && err.name === 'DiscordAPIError') {
        const code = err.code ?? '未知錯誤碼';
        const message = typeof err.message === 'string' ? err.message : '';

        if (Array.isArray(err.missingPermissions) && err.missingPermissions.length > 0) {
          const details = err.missingPermissions
            .map((perm) => {
              const resolver = extraPermissionMessages[perm];
              if (resolver) {
                return resolver(context.channel || context.guild);
              }
              return `❌ 缺少權限：${perm}`;
            })
            .join('\n');
          return `[${code}] 權限不足：\n${details}`;
        }

        return `[${code}] ${localizeErrorInternal(message, localizationData)}`;
      }

      if (err instanceof Error) {
        return localizeErrorInternal(err.message || err.toString(), localizationData);
      }

      if (typeof err === 'object' && err !== null) {
        return localizeErrorInternal(err.toString(), localizationData);
      }

      return localizeErrorInternal(String(err), localizationData);
    } catch (formatterError) {
      return `⚠️ 錯誤解析失敗：${formatterError?.message || '未知例外'}`;
    }
  };
}

function createErrorTools(options = {}) {
  const localizationData = loadLocalizationData(options.localizationPath);
  const extraPermissionMessages = buildExtraPermissionMessages();

  return {
    localizationData,
    extraPermissionMessages,
    localizeError: (message) => localizeErrorInternal(message, localizationData),
    getSafeErrorMessage: createErrorFormatter({ localizationData, extraPermissionMessages })
  };
}

module.exports = {
  createErrorTools,
  loadLocalizationData,
  buildExtraPermissionMessages
};
