// commands/測試-mariadb.js
const { SlashCommandBuilder } = require('discord.js');
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');
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
        .setName('測試-mariadb')
        .setDescription('測試 MariaDB 連線與查詢'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let conn;
        try {
            const DB = loadDbConfig();
            conn = await mariadb.createConnection(DB);

            // 執行簡單查詢
            const rows = await conn.query('SELECT NOW() AS now_time;');
            await interaction.editReply(`✅ MariaDB 連線成功！`);
        } catch (err) {
            console.error('MariaDB 測試失敗', err);
            await interaction.editReply(`❌ MariaDB 測試失敗：${err.message || err}`);
        } finally {
            if (conn) await conn.end();
        }
    },
};