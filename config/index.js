// 讀取 .env 與 apikeyconfig.local.json，統一輸出給全專案使用。
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const projectRoot = path.resolve(__dirname, '..');
const envFile = path.join(projectRoot, '.env');
dotenv.config(fs.existsSync(envFile) ? { path: envFile } : {});

const localConfigPath = path.join(projectRoot, 'apikeyconfig.local.json');
let localConfig = {};
if (fs.existsSync(localConfigPath)) {
  try {
    const raw = fs.readFileSync(localConfigPath, 'utf8');
    localConfig = JSON.parse(raw || '{}');
  } catch (error) {
    console.warn('[config] 無法解析 apikeyconfig.local.json，將忽略：', error.message);
  }
}

const read = (key, fallback) => {
  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== '') return envValue;
  if (Object.prototype.hasOwnProperty.call(localConfig, key) && localConfig[key] !== '') {
    return localConfig[key];
  }
  return fallback;
};

const readNumeric = (key, fallback) => {
  const raw = read(key);
  if (raw === undefined || raw === null || raw === '') return fallback;
  const num = Number(raw);
  return Number.isFinite(num) ? num : fallback;
};

const readFloat = (key, fallback) => {
  const raw = read(key);
  if (raw === undefined || raw === null || raw === '') return fallback;
  const num = parseFloat(raw);
  return Number.isFinite(num) ? num : fallback;
};

const readJSON = (key, fallback) => {
  const raw = read(key);
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const readArray = (key) => {
  const raw = read(key);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean).map(String);
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
  }
  return [];
};

const config = {
  MODEL: read('MODEL', 'gpt-3.5-turbo'),
  OPENAI_MODEL: read('OPENAI_MODEL', read('MODEL', 'gpt-3.5-turbo')),
  BOT_VERSION: read('BOT_VERSION', 'V2.2.0'),
  MAX_LENGTH: readNumeric('MAX_LENGTH', 200),
  RESPONSE_DELAY: readNumeric('RESPONSE_DELAY', 500),
  TOP_P: readFloat('TOP_P', 0.7),
  TEMPERATURE: readFloat('TEMPERATURE', 1.2),
  PRESENCE_PENALTY: readFloat('PRESENCE_PENALTY', 1.5),
  FREQUENCY_PENALTY: readFloat('FREQUENCY_PENALTY', 1.2),
  LOGIT_BIAS: readJSON('LOGIT_BIAS', {}),
  OCR_API_KEY: read('OCR_API_KEY'),
  TOKEN: read('TOKEN', read('BOT_TOKEN')),
  CLIENT_ID: read('CLIENT_ID'),
  GUILD_ID: read('GUILD_ID'),
  CHANNEL_ID: read('CHANNEL_ID'),
  CREATOR_ID: read('CREATOR_ID'),
  OSU_KEY: read('OSU_KEY'),
  HYPIXEL_KEY: read('HYPIXEL_KEY'),
  GITHUB_KEY: read('GITHUB_KEY'),
  YOUTUBE_KEY: read('YOUTUBE_KEY'),
  WEATHER_API_KEY: read('WEATHER_API_KEY'),
  REDIS_PASSWORD: read('REDIS_PASSWORD'),
  REDIS_HOST: read('REDIS_HOST'),
  REDIS_PORT: readNumeric('REDIS_PORT', 6379),
  HF_API: read('HF_API'),
  HORDE_API: read('HORDE_API'),
  OPENAI_KEY: read('OPENAI_KEY', read('OPENAI_API_KEY')),
  CWB_API: read('CWB_API'),
  WEATHER_API: read('WEATHER_API'),
  PTERODACTYL_API: read('PTERODACTYL_API'),
  SERVER_ID: read('SERVER_ID'),
  search_key: read('search_key', read('SEARCH_KEY')),
  search_engine_id: read('search_engine_id', read('SEARCH_ENGINE_ID')),
  SUPABASEURL: read('SUPABASEURL', read('SUPABASE_URL')),
  SUPABASEKEY: read('SUPABASEKEY', read('SUPABASE_KEY')),
  DB_HOST: read('DB_HOST'),
  DB_PORT: readNumeric('DB_PORT', 3306),
  DB_USER: read('DB_USER'),
  DB_PASS: read('DB_PASS'),
  DB_NAME: read('DB_NAME'),
  CREATE_IMAGE_API_KEYS: readArray('CREATE_IMAGE_API_KEYS'),
  ERROR_SERVER_ID: read('ERROR_SERVER_ID'),
  ERROR_CHANNEL_ID: read('ERROR_CHANNEL_ID'),
  API_KEYS: readArray('API_KEYS')
};

const requiredKeys = ['TOKEN', 'CLIENT_ID'];
const missing = requiredKeys.filter((key) => !config[key]);
if (missing.length > 0) {
  throw new Error(`缺少必要的環境設定：${missing.join(', ')}`);
}

module.exports = Object.freeze(config);