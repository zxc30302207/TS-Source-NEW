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

  const textCommands = loadTextCommands(textCommandDir);
  for (const command of textCommands) {
    client.commands.set(command.name, command);
  }

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

