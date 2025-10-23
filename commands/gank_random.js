// commands/好玩系統-給我幹圖.js
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');

function loadDbConfig() {
    const required = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
    for (const key of required) {
        if (!config[key]) {
            throw new Error(`請在 .env 或 apikeyconfig.local.json 設定 ${key}。`);
        }
    }
    return {
        host: config.DB_HOST,
        port: config.DB_PORT ? Number(config.DB_PORT) : 3306,
        user: config.DB_USER,
        password: config.DB_PASS,
        database: config.DB_NAME
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('好玩系統-給我幹圖')
        .setDescription('隨機獲得一張幹圖'),

    async execute(interaction) {
        await interaction.deferReply();

        let conn;
        try {
            const DB = loadDbConfig();
            conn = await mariadb.createConnection(DB);

            // 從資料庫隨機抓一張圖片
            const rows = await conn.query('SELECT filename, mime, data FROM images ORDER BY RAND() LIMIT 1');
            if (!rows.length) return interaction.editReply('❌ 資料庫沒有圖片');

            const row = rows[0];

            // 先存成暫存檔
            const tmpFile = path.join(os.tmpdir(), `image_${Date.now()}${path.extname(row.filename)}`);
            fs.writeFileSync(tmpFile, row.data);

            const attachment = new AttachmentBuilder(tmpFile, { name: row.filename });
            await interaction.editReply({ content: '📸 幹圖來啦！', files: [attachment] });

            // 刪掉暫存檔
            fs.unlink(tmpFile, () => {});

        } catch (err) {
            console.error('發送圖片失敗', err);
            await interaction.editReply('❌ 發送圖片失敗');
        } finally {
            if (conn) await conn.end();
        }
    }
};