// import_photos_mariadb.js
const mariadb = require('mariadb');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const PHOTO_DIR = path.resolve(__dirname, 'photo');

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

async function fileList(dir) {
    const out = [];
    const items = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const it of items) {
        const full = path.join(dir, it.name);
        if (it.isDirectory()) {
            out.push(...(await fileList(full)));
        } else if (it.isFile()) {
            out.push(full);
        }
    }
    return out;
}

(async () => {
    let conn;
    try {
        const DB = loadDbConfig();
        conn = await mariadb.createConnection(DB);
        console.log('✅ MariaDB 連線成功');

        // 建立資料表
        await conn.query(`
CREATE TABLE IF NOT EXISTS images (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  mime VARCHAR(128) NOT NULL,
  data LONGBLOB NOT NULL,
  uploaded_by VARCHAR(128) NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(filename(64))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        if (!fs.existsSync(PHOTO_DIR)) {
            console.error('photo 資料夾不存在', PHOTO_DIR);
            process.exit(1);
        }

        const files = await fileList(PHOTO_DIR);
        if (!files.length) {
            console.log('photo 資料夾內沒有檔案');
            process.exit(0);
        }

        for (const f of files) {
            const filename = path.relative(PHOTO_DIR, f).replace(/\\/g, '/');

            // 檢查是否已存在
            const exists = await conn.query('SELECT 1 FROM images WHERE filename = ? LIMIT 1', [filename]);
            if (exists.length) {
                continue;
            }

            const buf = await fs.promises.readFile(f);
            const ext = path.extname(f).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' :
                             ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                             ext === '.gif' ? 'image/gif' :
                             'application/octet-stream';

            await conn.query(
                'INSERT INTO images (filename, mime, data, uploaded_by) VALUES (?, ?, ?, ?)',
                [filename, mimeType, buf, 'import_script']
            );

            console.log(`✅ 已導入：${filename}`);
        }

        console.log('🎉 所有未導入的圖片已成功導入資料庫！');
    } catch (err) {
        console.error('導入失敗：', err);
    } finally {
        if (conn) await conn.end();
    }
})();