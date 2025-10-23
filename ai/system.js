// 管理 AI 對話記憶、OpenAI 請求與離線fallback邏輯。
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const config = require('../config');

const MEMORY_ROOT = process.env.AI_MEMORY_ROOT
  ? path.resolve(process.env.AI_MEMORY_ROOT)
  : path.join(__dirname, '..', 'memory');
const USER_MEMORY_DIR = path.join(MEMORY_ROOT, 'user');
const BOT_MEMORY_DIR = path.join(MEMORY_ROOT, 'bot');
const FAMILY_MEMORY_FILE = path.join(BOT_MEMORY_DIR, 'family.json');

const MAX_MEMORY_PER_USER = 50;
const MAX_CONTEXT_MESSAGES = 6;

let openAIClient;
const userMemoryCache = new Map();
let familyMemoryCache;

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function safeReadJSON(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[ai/system] 無法解析 JSON (${filePath}):`, error.message);
    return fallback;
  }
}

function safeWriteJSON(filePath, data) {
  try {
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`[ai/system] 寫入 JSON 失敗 (${filePath}):`, error.message);
  }
}

// 將使用者歷史訊息緩存在記憶體，減少頻繁檔案存取。
function loadUserMemory(userId) {
  if (userMemoryCache.has(userId)) {
    return userMemoryCache.get(userId);
  }
  const filePath = path.join(USER_MEMORY_DIR, `${userId}.json`);
  const data = safeReadJSON(filePath, []);
  userMemoryCache.set(userId, data);
  return data;
}

function persistUserMemory(userId) {
  const data = userMemoryCache.get(userId) || [];
  const filePath = path.join(USER_MEMORY_DIR, `${userId}.json`);
  safeWriteJSON(filePath, data);
}

// 家庭共享記憶提供全域背景設定。
function getFamilyMemory() {
  if (familyMemoryCache) return familyMemoryCache;
  familyMemoryCache = safeReadJSON(FAMILY_MEMORY_FILE, []);
  return familyMemoryCache;
}

function persistFamilyMemory() {
  safeWriteJSON(FAMILY_MEMORY_FILE, getFamilyMemory());
}

async function saveUserMemory(userId, content) {
  if (!userId || !content) return;
  const memories = loadUserMemory(userId);
  memories.push({ timestamp: new Date().toISOString(), content: String(content) });
  if (memories.length > MAX_MEMORY_PER_USER) {
    memories.splice(0, memories.length - MAX_MEMORY_PER_USER);
  }
  persistUserMemory(userId);
}

async function addFamilyMemory(content) {
  if (!content) return;
  const memory = getFamilyMemory();
  memory.push({ timestamp: new Date().toISOString(), content: String(content) });
  if (memory.length > MAX_MEMORY_PER_USER) {
    memory.splice(0, memory.length - MAX_MEMORY_PER_USER);
  }
  persistFamilyMemory();
}

// 延遲建立 OpenAI client，沒有金鑰時維持離線模式。
function getOpenAIClient() {
  if (openAIClient !== undefined) return openAIClient;

  const apiKey = config.OPENAI_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    openAIClient = null;
    return openAIClient;
  }

  openAIClient = new OpenAI({ apiKey });
  return openAIClient;
}

// 組合系統／使用者近期訊息，提供模型必要的上下文。
function buildContextMessages(userId) {
  const context = [];
  const userMemories = loadUserMemory(userId).slice(-MAX_CONTEXT_MESSAGES);
  const familyMemories = getFamilyMemory().slice(-MAX_CONTEXT_MESSAGES);

  for (const entry of familyMemories) {
    context.push({
      role: 'system',
      content: `重要背景：${entry.content}`
    });
  }

  for (const entry of userMemories) {
    context.push({
      role: 'user',
      content: `過去記錄 (${new Date(entry.timestamp).toLocaleString('zh-TW')}): ${entry.content}`
    });
  }

  return context;
}

// 失去雲端服務時提供可理解的備援回覆。
function formatFallbackResponse(content, userId) {
  const recent = loadUserMemory(userId).slice(-3).map((entry) => `• ${entry.content}`).join('\n');
  const memorySection = recent ? `\n\n你之前提過：\n${recent}` : '';
  return `我目前無法連線至雲端模型，所以先簡單回覆你：「${content}」。${memorySection}`;
}

function formatError(error) {
  const message = error?.message || '未知錯誤';
  const status = error?.status || error?.code;
  return `# 😴 我睡著了，這是錯誤細節：\n\`\`\`bash\n${status ? `[${status}] ` : ''}${message}\n\`\`\``;
}

// 核心進入點：整理上下文、呼叫模型並回寫記憶。
async function handleAIMessage(userId, content) {
  if (!content) return '我沒有收到內容，能再說一次嗎？';

  const client = getOpenAIClient();
  if (!client) {
    return formatFallbackResponse(content, userId);
  }

  const messages = [
    {
      role: 'system',
      content: '你是吐司機器人，使用繁體中文回覆，語氣自然、親切且避免重複。'
    },
    ...buildContextMessages(userId),
    {
      role: 'user',
      content
    }
  ];

  try {
    const completion = await client.chat.completions.create({
      model: config.MODEL || config.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages,
      temperature: Number.isFinite(config.TEMPERATURE) ? config.TEMPERATURE : 0.7,
      top_p: Number.isFinite(config.TOP_P) ? config.TOP_P : 0.95,
      max_tokens: 512
    });

    const text = completion?.choices?.[0]?.message?.content?.trim();
    if (text) return text;
    return formatFallbackResponse(content, userId);
  } catch (error) {
    console.error('[ai/system] OpenAI 回覆失敗：', error);
    return formatError(error);
  }
}

module.exports = {
  handleAIMessage,
  saveUserMemory,
  addFamilyMemory
};