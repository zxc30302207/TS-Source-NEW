const { REST, Routes } = require('discord.js');

async function registerSlashCommands(options) {
  const {
    applicationId,
    token,
    commands,
    guildId
  } = options;

  if (!Array.isArray(commands) || commands.length === 0) {
    console.warn('[registerSlashCommands] 沒有可註冊的指令，略過同步');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: commands });
      console.log(`✅ 已同步 ${commands.length} 個伺服器 Slash 指令 (Guild ${guildId})`);
    } else {
      await rest.put(Routes.applicationCommands(applicationId), { body: commands });
      console.log(`✅ 已同步 ${commands.length} 個全域 Slash 指令`);
    }
  } catch (error) {
    console.error('[registerSlashCommands] 同步 Slash 指令失敗:', error);
    throw error;
  }
}

module.exports = registerSlashCommands;

