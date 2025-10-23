// 建立集中化日誌系統：負責輪替、壓縮與 console 攔截。
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pipeline } = require('stream');

function safeStringify(value) {
  try {
    if (typeof value === 'string') return value;
    if (value instanceof Error) {
      return value.stack || value.message || value.toString();
    }
    if (Buffer.isBuffer(value)) {
      return value.toString('utf8');
    }
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'object') {
      const seen = new Set();
      return JSON.stringify(
        value,
        (key, current) => {
          if (typeof current === 'object' && current !== null) {
            if (seen.has(current)) return '[Circular]';
            seen.add(current);
          }
          if (current instanceof Error) {
            return current.stack || current.message || current.toString();
          }
          if (Buffer.isBuffer(current)) {
            return current.toString('utf8');
          }
          return current;
        },
        2
      );
    }
    return String(value);
  } catch (error) {
    try {
      return String(value);
    } catch {
      return '[Unserializable]';
    }
  }
}

// 若前一次啟動留下舊日誌，這裡會將它壓縮並重新建立 latest.log。
function rotateLog(latestLog) {
  if (!fs.existsSync(latestLog)) {
    fs.writeFileSync(latestLog, '');
    return;
  }

  const stats = fs.statSync(latestLog);
  if (stats.size === 0) {
    fs.writeFileSync(latestLog, '');
    return;
  }

  const time = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
  const logDir = path.dirname(latestLog);
  let tmpLog = path.join(logDir, `latest-${time}.log`);
  const archivePath = path.join(logDir, `log-${time}.log.gz`);

  try {
    fs.renameSync(latestLog, tmpLog);
  } catch (error) {
    console.error('[setupLogging] 無法重新命名最新日誌檔案:', error);
    tmpLog = null;
  }

  const sourcePath = tmpLog && fs.existsSync(tmpLog) ? tmpLog : latestLog;

  pipeline(
    fs.createReadStream(sourcePath),
    zlib.createGzip(),
    fs.createWriteStream(archivePath),
    (error) => {
      if (error) {
        console.error('[setupLogging] 壓縮舊日誌失敗:', error);
      } else if (tmpLog) {
        fs.promises.unlink(tmpLog).catch(() => {});
      }
    }
  );

  fs.writeFileSync(latestLog, '');
}

// 將 console.* 重新導向到檔案，同時保留原生輸出，供 CLI 顯示使用。
function setupLogging(options = {}) {
  const {
    rootDir = process.cwd(),
    logDirName = 'log',
    latestLogName = 'latest.log'
  } = options;

  const logDir = path.join(rootDir, logDirName);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const latestLog = path.join(logDir, latestLogName);
  rotateLog(latestLog);

  const logStream = fs.createWriteStream(latestLog, { flags: 'a' });

  function writeLog(level, ...args) {
    const line = args.map((arg) => safeStringify(arg)).join(' ');
    const time = new Date().toISOString().replace('T', ' ').split('.')[0];
    const output = `[${time}] [${level}] ${line}\n`;
    if (!logStream.write(output)) {
      logStream.once('drain', () => {});
    }
    return output.trim();
  }

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => originalLog(writeLog('INFO', ...args));
  console.warn = (...args) => originalWarn(writeLog('WARN', ...args));
  console.error = (...args) => originalError(writeLog('ERROR', ...args));

  return {
    logDir,
    latestLog,
    logStream,
    writeLog,
    restore() {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      logStream.end();
    }
  };
}

module.exports = setupLogging;
