// 集中處理 Slash/Modal/Button 等互動事件，避免在主程式重複綁定。
const {
  Events,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const formatError = require('../utils/formatError');
const logEvent = require('../events/logEvent');

function registerInteractionHandlers(client) {
  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(client, interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        await handleModalSubmit(client, interaction);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(client, interaction);
        return;
      }

      if (interaction.isButton()) {
        await handleButton(client, interaction);
        return;
      }
    } catch (error) {
      console.error('❌ 互動處理錯誤：', formatError(error));

      if (interaction && !interaction.replied && !interaction.deferred) {
        const errorReply = {
          content: '⚠️ 系統目前無法回應，請稍後再試。',
          flags: MessageFlags.Ephemeral
        };
        await interaction.reply(errorReply).catch(() => {});
      } else {
        console.warn('⚠️ 互動已回應，僅記錄錯誤日誌。');
      }
    }
  });
}

async function handleSlashCommand(client, interaction) {
  await logEvent.logSlashCommand(client, interaction);

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  let isResponded = false;

  const timeout = setTimeout(async () => {
    console.log('⚠️ 指令處理逾時');

    if (!isResponded) {
      const payload = {
        content: '⌛ 處理時間較長，請稍候…',
        flags: MessageFlags.Ephemeral
      };

      try {
        if (interaction.deferred) {
          await interaction.followUp(payload);
        } else if (!interaction.replied) {
          await interaction.reply(payload);
        } else {
          await interaction.followUp(payload);
        }

        isResponded = true;
      } catch (err) {
        console.warn('⚠️ 自動回應失敗：', formatError(err));
      }
    }
  }, 10000);

  try {
    await command.execute(interaction);

    if (!isResponded) {
      clearTimeout(timeout);
      isResponded = true;
    }
  } catch (err) {
    console.error(`❌ 指令「${interaction.commandName}」執行錯誤：`, formatError(err));

    const errorReply = {
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ 指令執行發生錯誤')
          .setDescription(`\`\`\`${formatError(err)}\`\`\``)
          .setColor(0xFF0000)
      ],
      flags: MessageFlags.Ephemeral
    };

    if (!isResponded) {
      clearTimeout(timeout);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply).catch(() => {});
      } else {
        await interaction.reply(errorReply).catch(() => {});
      }
      isResponded = true;
    } else {
      await interaction.followUp(errorReply).catch(() => {});
    }
  }
}

async function handleModalSubmit(client, interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  for (const cmd of client.commands.values()) {
    if (typeof cmd.modalSubmit === 'function') {
      try {
        await cmd.modalSubmit(interaction);
      } catch (err) {
        console.error(`❌ ModalSubmit 錯誤（${interaction.customId}）：`, formatError(err));
      }
    }
  }
}

async function handleSelectMenu(client, interaction) {
  const ignoredPrefixes = ['select_song_'];

  if (interaction.customId && ignoredPrefixes.some((p) => interaction.customId.startsWith(p))) {
    return;
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

  for (const cmd of client.commands.values()) {
    if (typeof cmd.componentHandler === 'function') {
      try {
        await cmd.componentHandler(interaction);
      } catch (err) {
        console.error(`❌ SelectMenu 錯誤（${interaction.customId}）：`, formatError(err));
      }
    }
  }
}

async function handleButton(client, interaction) {
  const perMessageButtonPrefixes = [
    'select_song_',
    'resume_',
    'pause_',
    'stop_',
    'loop_',
    'prev_',
    'next_',
    'volume_btn_',
    'stop_leave_'
  ];

  if (interaction.customId && perMessageButtonPrefixes.some((p) => interaction.customId.startsWith(p))) {
    return;
  }

  if (interaction.customId === 'refresh_status') {
    const statusCommand = client.commands.get('其他-當前狀態');
    if (statusCommand) {
      try {
        const mockInteraction = {
          ...interaction,
          reply: async (options) => interaction.update(options)
        };
        await statusCommand.execute(mockInteraction);
      } catch (err) {
        console.error('刷新狀態錯誤:', formatError(err));
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: '⚠️ 刷新失敗，請稍後再試', flags: MessageFlags.Ephemeral }).catch(() => {});
        }
      }
    }
    return;
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

  for (const cmd of client.commands.values()) {
    if (typeof cmd.componentHandler === 'function') {
      try {
        await cmd.componentHandler(interaction);
      } catch (err) {
        console.error(`❌ Button 錯誤（${interaction.customId}）：`, formatError(err));
      }
    }
  }

  const pageButtons = ['first', 'prev', 'next', 'last', 'close'];
  if (!pageButtons.includes(interaction.customId)) return;

  const ownerId = interaction.message?.interaction?.user?.id;
  if (!ownerId || ownerId !== interaction.user.id) {
    return interaction.followUp({
      content: '⚠️ 只能由召喚指令的使用者操作此分頁。',
      flags: MessageFlags.Ephemeral
    });
  }

  const commands = [...client.commands.values()];
  const pageMatch = interaction.message.embeds[0]?.footer?.text?.match(/第 (\d+) \/ (\d+) 頁/);
  if (!pageMatch) return;

  let currentPage = parseInt(pageMatch[1], 10);
  const totalPages = parseInt(pageMatch[2], 10);

  if (interaction.customId === 'first') currentPage = 1;
  if (interaction.customId === 'prev' && currentPage > 1) currentPage--;
  if (interaction.customId === 'next' && currentPage < totalPages) currentPage++;
  if (interaction.customId === 'last') currentPage = totalPages;

  if (interaction.customId === 'close') {
    return interaction.message.delete().catch(() => {});
  }

  const embed = getCommandEmbed(commands, currentPage, totalPages);
  const row = getActionRow();
  return interaction.update({ embeds: [embed], components: [row] });
}

function getCommandEmbed(commands, page, totalPages) {
  const pageSize = 5;
  const embed = new EmbedBuilder()
    .setTitle('📚 指令導覽 | 斜線指令清單')
    .setColor(0xFFAA33)
    .setFooter({ text: `第 ${page} / ${totalPages} 頁 - 由 TSBOT 提供` })
    .setTimestamp();

  embed.setDescription(
    commands
      .filter((cmd) => cmd.data)
      .slice((page - 1) * pageSize, page * pageSize)
      .map((cmd) => `</${cmd.data.name}:${cmd.data.name}> - ${cmd.data.description || '未提供描述'}`)
      .join('\n')
  );

  return embed;
}

function getActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('first').setLabel('⏮').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('last').setLabel('⏭').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('close').setLabel('關閉').setStyle(ButtonStyle.Danger)
  );
}

module.exports = registerInteractionHandlers;