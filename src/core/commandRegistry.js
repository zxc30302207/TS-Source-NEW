// 載入並快取 text/slash 指令，提供給 BotApp 做統一註冊。
const path = require('path');
const { Collection } = require('discord.js');
const { loadTextCommands, loadSlashCommands } = require('../../utils/loadCommands');

function registerCommands(client, options = {}) {
  const {
    rootDir = path.resolve(__dirname, '..', '..'),
    textCommandDir = path.join(rootDir, 'textcommands'),
    slashCommandDir = path.join(rootDir, 'commands')
  } = options;

  if (!client.commands) {
    client.commands = new Collection();
  }

  // 文字指令放進 client.commands，供訊息處理器直接呼叫。
  const textCommands = loadTextCommands(textCommandDir);
  for (const command of textCommands) {
    client.commands.set(command.name, command);
  }

  // Slash 指令需同時保留 payload，稍後交給 REST 同步到 Discord。
  const slashCommands = loadSlashCommands(slashCommandDir);
  const slashPayload = [];
  for (const command of slashCommands) {
    const name = command?.data?.name;
    if (!name) continue;
    client.commands.set(name, command);
    slashPayload.push(command.data.toJSON());
  }

  return {
    textCommands,
    slashCommands,
    slashPayload
  };
}

module.exports = registerCommands;
