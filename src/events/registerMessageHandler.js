const fs = require('fs');
const path = require('path');
const axios = require('axios');
const AdmZip = require('adm-zip');
const fetch = require('node-fetch');
const { EmbedBuilder } = require('discord.js');
const { create, all } = require('mathjs');

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'rst', 'adoc',
  'json', 'log', 'csv', 'tsv', 'html', 'htm',
  'css', 'js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx',
  'xml', 'yml', 'yaml', 'ini', 'toml', 'env',
  'py', 'pyw', 'java', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp',
  'cs', 'rb', 'php', 'go', 'rs', 'swift', 'kt', 'kotlin',
  'scala', 'pl', 'perl', 'r', 'm', 'mat', 'sql',
  'sh', 'bash', 'zsh', 'bat', 'ps1'
]);

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'
]);

const ZIP_EXTENSIONS = new Set(['zip']);

const SEARCH_TRIGGERS = [
  '搜尋', '查詢', 'google', 'search', '找一下', '查一下', '幫我查'
];

const TIME_TRIGGERS = [
  '現在幾點', '現在幾點了', '什麼時候', '現在時間', '現在幾點鐘',
  'what time', '時間?', 'time?'
];

const bannedWordsCache = new Map();
const recentAttachmentMessages = new Set();

const math = create(all, {
  number: 'BigNumber',
  precision: 100
});

function resolveExtension(name) {
  const ext = path.extname(name || '').toLowerCase().replace('.', '');
  return ext;
}

async function loadBannedWords(guildId) {
  const cacheEntry = bannedWordsCache.get(guildId);
  const now = Date.now();
  if (cacheEntry && now - cacheEntry.timestamp < 60_000) {
    return cacheEntry.words;
  }

  const bannedWordsPath = path.resolve(process.cwd(), 'memory', 'bannedwords.json');
  let data = {};
  if (fs.existsSync(bannedWordsPath)) {
    try {
      const raw = fs.readFileSync(bannedWordsPath, 'utf8');
      data = JSON.parse(raw || '{}');
    } catch (error) {
      console.error('⚠️ 讀取違禁詞設定檔案失敗:', error);
    }
  }

  const words = Array.isArray(data[guildId]) ? data[guildId] : [];
  bannedWordsCache.set(guildId, { timestamp: now, words });
  return words;
}

async function enforceBannedWords(message) {
  if (!message.guild) return false;
  const words = await loadBannedWords(message.guild.id);
  if (words.length === 0) return false;

  const lowered = message.content.toLowerCase();
  const hasBannedWord = words.some((word) => lowered.includes(String(word).toLowerCase()));
  if (!hasBannedWord) return false;

  try {
    await message.delete();
    await message.channel.send(`⚠️ ${message.author} 請注意，此伺服器禁止特定詞彙！`).catch(() => {});
  } catch (error) {
    console.error('❌ 刪除違禁詞訊息失敗:', error);
    await message.channel.send('⚠️ 偵測到禁用詞彙，但刪除訊息失敗。').catch(() => {});
  }
  return true;
}

function shouldRespondToMessage(message, clientUser) {
  if (message.mentions.everyone || message.content.includes('@everyone') || message.content.includes('@here')) {
    return false;
  }

  if (message.mentions.has(clientUser)) {
    const soloMention = message.mentions.users.size === 1 && message.mentions.has(clientUser);
    if (soloMention) return true;
  }

  const repliedUser = message.mentions?.repliedUser;
  if (repliedUser && repliedUser.id === clientUser.id) {
    return true;
  }

  return false;
}

function stripMentions(content, clientUserId) {
  const mentionRegex = new RegExp(`<@!?${clientUserId}>`, 'g');
  return content.replace(mentionRegex, '').trim();
}

function matchTrigger(content, triggers) {
  const lowered = content.toLowerCase();
  return triggers.some((trigger) => lowered.includes(trigger.toLowerCase()));
}

async function handleTimeTrigger(message) {
  const now = new Date();
  const formatted = now.toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour12: false
  });
  await message.reply(`🕒 現在時間：${formatted}`);
}

function buildSearchPattern() {
  const escaped = SEARCH_TRIGGERS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^(${escaped.join('|')})`, 'i');
}

async function performGoogleSearch(query, message, config) {
  const apiKey = config?.search_key || config?.SEARCH_KEY;
  const engineId = config?.search_engine_id || config?.SEARCH_ENGINE_ID;
  if (!apiKey) {
    await message.reply('❌ 搜尋功能配置錯誤：缺少 API Key\n請於 .env 或 apikeyconfig.local.json 設定 "search_key"');
    return true;
  }
  if (!engineId) {
    await message.reply('❌ 搜尋功能配置錯誤：缺少搜尋引擎 ID\n請於 .env 或 apikeyconfig.local.json 設定 "search_engine_id"');
    return true;
  }

  try {
    const res = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx: engineId,
        q: query,
        num: 5,
        lr: 'lang_zh-TW',
        safe: 'active'
      },
      timeout: 10_000
    });

    const items = res.data.items || [];
    if (items.length === 0) {
      await message.reply('⚠️ 找不到相關結果，請換個關鍵字再嘗試搜尋！');
      return true;
    }

    const resultLines = items.slice(0, 5).map((item, index) => {
      const title = item.title?.length > 100 ? `${item.title.slice(0, 100)}...` : item.title;
      const snippet = item.snippet?.length > 200 ? `${item.snippet.slice(0, 200)}...` : item.snippet;
      return `**${index + 1}. [${title}](${item.link})**\n${snippet || '（無摘要）'}`;
    });

    await message.reply(`🔍 **查詢結果：**\n\n${resultLines.join('\n\n')}`);
    return true;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      if (status === 403) {
        await message.reply('❌ Google 搜尋配額已用完，請稍後再試或聯繫管理員。');
      } else if (status === 400) {
        await message.reply('❌ 搜尋請求格式錯誤，請檢查搜尋引擎 ID 設定。');
      } else if (status === 429) {
        await message.reply('❌ 搜尋請求過於頻繁，請稍後再試。');
      } else {
        await message.reply(`❌ Google API 錯誤 (${status})，請稍後再試。`);
      }
    } else if (error.code === 'ENOTFOUND') {
      await message.reply('❌ 網路連線失敗，請檢查網路狀態。');
    } else if (error.code === 'ETIMEDOUT') {
      await message.reply('❌ 搜尋請求超時，請稍後再試。');
    } else {
      await message.reply(`❌ 搜尋功能發生錯誤: ${error.message}`);
    }
    return true;
  }
}

async function handleCalculator(content, message, client, saveUserMemory) {
  const calcRegex = new RegExp(`<@!?${client.user.id}>\\s*計算\\s*(.+)`, 'i');
  const match = content.match(calcRegex);
  if (!match || !match[1]) return false;

  const expression = match[1].trim();
  try {
    const result = math.evaluate(expression);
    await saveUserMemory(message.author.id, expression);
    await saveUserMemory(client.user.id, String(result));
    await message.reply(`🧮 計算結果是：\`${result}\``);
    return true;
  } catch (error) {
    const embed = new EmbedBuilder()
      .setTitle('🧮 無法計算，錯誤細節')
      .setDescription(`\`\`\`${error.message}\`\`\``)
      .setColor(0xff0000);

    await message.reply({ embeds: [embed] });
    return true;
  }
}

async function downloadBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下載失敗: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function summarizeTextContent(buffer, fileName) {
  const text = buffer.toString('utf8').replace(/\r\n/g, '\n');
  const preview = text.length > 1800 ? `${text.slice(0, 1800)}...\n（內容過長，僅顯示部分）` : text;
  return `📄 **${fileName}**\n\`\`\`\n${preview}\n\`\`\``;
}

function summarizeZip(buffer, fileName) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().slice(0, 10);
  const listing = entries.map((entry, index) => `- ${index + 1}. ${entry.entryName} (${entry.getData().length} bytes)`).join('\n');
  return `🗂️ **${fileName}**（列出前 10 個檔案）\n${listing}`;
}

function summarizeImage(attachment) {
  const sizeMb = attachment.size / (1024 * 1024);
  return `🖼️ **${attachment.name}**\n- 類型：${attachment.contentType || '未知'}\n- 檔案大小：${sizeMb.toFixed(2)} MB\n- 目前暫無自動圖像描述`;
}

async function handleAttachments(message, incrementUploadCounter) {
  if (recentAttachmentMessages.has(message.id)) return;
  recentAttachmentMessages.add(message.id);

  const summaries = [];
  for (const attachment of message.attachments.values()) {
    incrementUploadCounter();
    try {
      const ext = resolveExtension(attachment.name);
      if (TEXT_EXTENSIONS.has(ext)) {
        const buffer = await downloadBuffer(attachment.url);
        summaries.push(summarizeTextContent(buffer, attachment.name));
      } else if (ZIP_EXTENSIONS.has(ext)) {
        const buffer = await downloadBuffer(attachment.url);
        summaries.push(summarizeZip(buffer, attachment.name));
      } else if (IMAGE_EXTENSIONS.has(ext)) {
        summaries.push(summarizeImage(attachment));
      } else {
        summaries.push(`📎 **${attachment.name}**\n- 類型：${attachment.contentType || '未知'}\n- 檔案大小：${(attachment.size / (1024 * 1024)).toFixed(2)} MB\n- 未支援自動分析`);
      }
    } catch (error) {
      console.error('⚠️ 分析附件失敗:', error);
      summaries.push(`⚠️ **${attachment.name}** 分析失敗：${error.message}`);
    }
  }

  if (summaries.length > 0) {
    const joined = summaries.join('\n\n---\n\n');
    if (joined.length > 1800) {
      await message.reply({
        content: '📎 附件摘要過長，請參考上傳的文字檔案。',
        files: [{
          attachment: Buffer.from(joined, 'utf8'),
          name: 'attachment-summary.txt'
        }]
      });
    } else {
      await message.reply(joined);
    }
  }
}

function registerMessageHandler(client, options) {
  const {
    config,
    checkBlacklist,
    handleTextCommand,
    handleAIMessage,
    saveUserMemory,
    formatError,
    incrementUploadCounter
  } = options;

  const searchPattern = buildSearchPattern();

  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.content || !message.content.trim()) return;

      const content = message.content.trim();

      if (content.startsWith('$') || content.startsWith('/')) {
        if (await checkBlacklist('message', message, true)) return;
        await handleTextCommand(message, client);
        return;
      }

      if (await checkBlacklist('message', message)) return;
      if (await enforceBannedWords(message)) return;

      const shouldRespond = shouldRespondToMessage(message, client.user);
      if (!shouldRespond) return;

      const cleanedContent = stripMentions(content, client.user.id);
      if (!cleanedContent) return;

      if (matchTrigger(cleanedContent, TIME_TRIGGERS)) {
        await handleTimeTrigger(message);
        return;
      }

      if (searchPattern.test(cleanedContent)) {
        const query = cleanedContent.replace(searchPattern, '').trim();
        if (query.length > 0) {
          const handled = await performGoogleSearch(query, message, config);
          if (handled) return;
        }
      }

      const calcHandled = await handleCalculator(cleanedContent, message, client, saveUserMemory);
      if (calcHandled) return;

      if (message.attachments.size > 0) {
        await handleAttachments(message, incrementUploadCounter);
      }

      await saveUserMemory(message.author.id, cleanedContent);
      await message.channel.sendTyping();

      const thinkingMessage = await message.reply('🤔 正在思考，請稍候...');
      const typingInterval = setInterval(() => {
        message.channel.sendTyping().catch(() => {});
      }, 9_000);

      try {
        const reply = await handleAIMessage(message.author.id, cleanedContent);
        await saveUserMemory(client.user.id, reply);
        await thinkingMessage.edit(reply);
      } catch (error) {
        const embed = new EmbedBuilder()
          .setTitle('😴 我睡著了，這是錯誤細節：')
          .setDescription(`\`\`\`${formatError(error)}\`\`\``)
          .setColor(0xff0000);
        await thinkingMessage.edit({ content: null, embeds: [embed] });
      } finally {
        clearInterval(typingInterval);
      }
    } catch (error) {
      console.error('❌ 處理訊息時發生錯誤:', error);
      await message.channel.send('⚠️ 處理訊息時發生錯誤，請稍後再試。').catch(() => {});
    } finally {
      setTimeout(() => recentAttachmentMessages.delete(message.id), 10_000);
    }
  });
}

module.exports = registerMessageHandler;

