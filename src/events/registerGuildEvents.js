// 新增/退出公會時的自動化流程：條款頻道建立與日誌記錄。
async function createTermsChannel(guild, privacyEmbed, buttonRow) {
  const channel = await guild.channels.create({
    name: '感謝您選擇使用吐司機器人---𝗧𝗦𝗕𝗢𝗧',
    type: 0,
    reason: '建立專用頻道來發送使用條款'
  });

  await channel.send({ embeds: [privacyEmbed], components: [buttonRow] });

  setTimeout(async () => {
    try {
      await channel.delete('⏰ 5分鐘自動刪除歡迎使用頻道');
      console.log(`✅ 已自動刪除 ${guild.name} 的歡迎頻道`);
    } catch (error) {
      console.error(`❌ 刪除 ${guild.name} 歡迎頻道失敗:`, error);
    }
  }, 5 * 60 * 1000);
}

function registerGuildEvents(client, options) {
  const { privacyEmbed, buttonRow, logEvent } = options;

  client.on('guildCreate', async (guild) => {
    logEvent?.logGuildJoin?.(client, guild);

    try {
      await createTermsChannel(guild, privacyEmbed, buttonRow);
      console.log(`✅ 已在 ${guild.name} 建立使用條款頻道並發送訊息`);
    } catch (error) {
      console.error(`❌ 建立 ${guild.name} 使用條款頻道失敗:`, error);
    }
  });

  client.on('guildDelete', (guild) => {
    logEvent?.logGuildLeave?.(client, guild);
  });
}

module.exports = registerGuildEvents;
