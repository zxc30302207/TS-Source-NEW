const fs = require('fs');
const path = require('path');

function safeRequire(filePath) {
  try {
    delete require.cache[require.resolve(filePath)];
    return require(filePath);
  } catch (error) {
    console.error(`[loadCommands] 載入指令失敗: ${filePath}`, error);
    return null;
  }
}

function loadFilesFromDir(dirPath, filterFn) {
  try {
    return fs.readdirSync(dirPath).filter(filterFn);
  } catch (error) {
    console.error(`[loadCommands] 無法讀取資料夾: ${dirPath}`, error);
    return [];
  }
}

function loadTextCommands(baseDir = path.resolve(__dirname, '..', 'textcommands')) {
  const files = loadFilesFromDir(baseDir, (file) => file.endsWith('.js'));
  return files
    .map((file) => safeRequire(path.join(baseDir, file)))
    .filter((command) => command && typeof command.name === 'string');
}

function loadSlashCommands(baseDir = path.resolve(__dirname, '..', 'commands')) {
  const files = loadFilesFromDir(baseDir, (file) => file.endsWith('.js'));
  return files
    .map((file) => safeRequire(path.join(baseDir, file)))
    .filter((command) => command?.data?.name);
}

module.exports = {
  loadTextCommands,
  loadSlashCommands
};
