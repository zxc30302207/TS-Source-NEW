// imageHandler.js - 簡化後的圖片處理工具（僅提供基本資訊摘要）
const axios = require('axios');
const path = require('path');

const SUPPORTED_IMAGES = new Set(['png', 'jpeg', 'jpg', 'gif', 'webp', 'bmp', 'svg', 'tiff', 'avif', 'heic']);
const MAX_INLINE_SIZE_MB = 10;

async function fetchImageSize(url) {
  try {
    const response = await axios.head(url, { timeout: 15000 });
    const size = Number(response.headers['content-length'] || 0);
    if (Number.isFinite(size) && size > 0) {
      return size;
    }
  } catch {
    // ignore
  }
  return null;
}

function formatBytes(bytes) {
  if (!bytes || !Number.isFinite(bytes)) return '未知大小';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

/**
 * 針對訊息附帶的圖片產生簡單摘要
 * @param {import('discord.js').Message} message
 * @returns {Promise<boolean>}
 */
async function handleImageAttachments(message) {
  if (!message.attachments?.size) return false;

  const lines = [];
  for (const attachment of message.attachments.values()) {
    const fileName = attachment.name || '未命名檔案';
    const ext = path.extname(fileName || '').toLowerCase().replace('.', '');

    if (!SUPPORTED_IMAGES.has(ext)) continue;

    const sizeBytes = attachment.size || (await fetchImageSize(attachment.url));
    const sizeLabel = formatBytes(sizeBytes);

    if (sizeBytes && sizeBytes > MAX_INLINE_SIZE_MB * 1024 * 1024) {
      lines.push(`📸 **${fileName}**\n- 類型：${ext || '未知'}\n- 檔案大小：${sizeLabel}\n- 提示：圖片超過 ${MAX_INLINE_SIZE_MB} MB，建議壓縮後再嘗試。`);
    } else {
      lines.push(`📸 **${fileName}**\n- 類型：${ext || '未知'}\n- 檔案大小：${sizeLabel}\n- 提示：目前未啟用自動描述，如需分析可使用 \`/create_image\` 或相關指令。`);
    }
  }

  if (!lines.length) return false;

  const body = lines.join('\n\n');
  await message.reply(body.length > 1900 ? `${body.slice(0, 1900)}\n\n*內容過長，已截斷*` : body);
  return true;
}

module.exports = { handleImageAttachments };

