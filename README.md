# TS-Source

```
          _oo0oo_
         o8888888o
         88" . "88
         (| -_- |)
         0\  =  /0
       ___/`---'\___
     .' \\|     |// '.
    / \\|||  :  |||// \
   / _||||| -:- |||||- \
  |   | \\\  -  /// |   |
  | \_|  ''\---/''  |_/ |
  \  .-\__  '-'  ___/-. /
___'. .'  /--.--\  `. .'___
."" '<  `.___\_<|>_/___.' >' "".
| | :  `- \`.;`\ _ /`;.`/ - ` : | |
\  \ `_.   \_ __\ /__ _/   .-` /  /
====`-.____`.___ \_____/___.-`___.-'====
             `=---='
         Toasty Discord Buddha
```

> 一切有為法，如夢幻泡影。  
> 先深呼吸，跟著佛陀的指引，TSBOT 就會啟動 🌟

---

## 🌍 專案地圖（知道有哪些就很夠）

| 模組位置 | 負責的事情 |
|----------|------------|
| `bot.js` | 啟動入口，所有魔法的源頭 |
| `src/app/` | `BotApp` 組裝整體啟動流程 |
| `src/core/` | 指令註冊、日誌、錯誤處理基礎 |
| `src/events/` | 訊息與互動事件邏輯 |
| `src/monitoring/` | 系統資源監控與警示 |
| `commands/`、`textcommands/`、`ai/` | 原有功能模組，直接延用 |

---

## 🧰 必備工具（電腦小白也能操作）

1. **安裝 Node.js**：進 <https://nodejs.org/> 下載 LTS 版本，一路下一步即可。
2. **取得 Discord Bot Token**：登入 <https://discord.com/developers/applications> → 建立 Bot → 複製 Token（別外流）。
3. **（選擇性）安裝 Git**：要用 git 指令就裝，不然用 ZIP 也可以。
4. **準備文字編輯器**：VS Code、Notepad++ 都可，負責改設定檔。

---

## 🧘‍♀️ Step by Step：電腦白癡也能上手

1. **下載專案**
   - 懶人法：點綠色 `Code` → `Download ZIP`，解壓縮到像 `C:\TS-Source` 的資料夾。
   - 進階法：`git clone https://github.com/你的帳號/TS-Source.git`

2. **複製設定檔**
   - 將 `.env.example` 複製成 `.env`。
   - 用編輯器打開 `.env`，照註解填入 `BOT_TOKEN`、`CLIENT_ID` 等必填項（沒有的先留空也可以）。

3. **（可選）建立 `apikeyconfig.local.json`**
   - 需要 JSON 管理金鑰時，複製 `apikeyconfig.local.example.json` → `apikeyconfig.local.json`。
   - `.env` 與 `.json` 會合併使用；這些檔案預設被 `.gitignore` 排除，別推上遠端。

4. **打開命令列**
   ```bash
   cd C:\TS-Source        # 換成你的實際路徑
   npm install
   ```

5. **啟動機器人**
   ```bash
   node bot.js
   ```
   看到終端機顯示「已登入」代表成功，想停止按 `Ctrl + C`。

6. **（可選）執行測試**
   ```bash
   npm test
   ```
   出現 PASS ✅ 就表示基礎功能正常。

7. **邀請 Bot 進伺服器**
   - 瀏覽器貼上：`https://discord.com/oauth2/authorize?client_id=你的CLIENT_ID&permissions=8&scope=bot%20applications.commands`
   - 選擇伺服器 → 按授權即可。

---

## 🧭 想更深入？可以看看這些

- `src/app/BotApp.js`：整體啟動與組態的主流程。
- `src/core/commandRegistry.js`：載入 Text/Slash 指令的方式。
- `ai/system.js`：AI 對話記憶與 OpenAI 互動邏輯。
- `src/monitoring/registerSystemMonitors.js`：各種監控與警示項目。

---

## 🙏 常見問題 FAQ

- **啟動失敗？** 再檢查 `.env` 是否漏填 Token 或寫錯字。
- **指令沒反應？** 確認 Bot 擁有讀取訊息／應用指令權限，Slash 指令同步需 1~5 分鐘。

- **想重啟？** 終端機按 `Ctrl + C` 停止，再 `node bot.js` 啟動。
- **碰到其他錯誤？** 把終端機訊息複製下來，附上操作步驟，另開 issue 或詢問同伴就好。

---

> 願智慧如光，照亮伺服器。祝你與 TSBOT 一切順利！ 🕯️
