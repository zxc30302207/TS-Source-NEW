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
> 先深呼吸，跟著佛陀的指引，機器人就會啟動 🧘‍♂️

---

## 🌟 專案亮點速覽

| 模組位置 | 做什麼事 |
|----------|----------|
| `bot.js` | 啟動入口，所有魔法從這裡開始 |
| `src/app/` | `BotApp` 組裝全局流程 |
| `src/core/` | 指令載入、日誌、錯誤防護 |
| `src/events/` | 訊息 / 互動 / 公會事件處理 |
| `src/monitoring/` | 系統資源監控，提醒你是否超載 |
| `commands/`、`textcommands/`、`ai/` | 原功能模組，直接延續使用 |

---

## 🛕 小白也能懂的準備清單

1. **安裝 Node.js**  
   - 進 <https://nodejs.org/> 按 LTS 版本，下一步下一步就對了。
2. **取得 Discord Bot Token**  
   - 登入 <https://discord.com/developers/applications> → 建立新應用程式 → 建立 Bot → 把 Token 複製下來（妥善保管！）。
3. **（可選）安裝 Git**  
   - 只想下載 ZIP 可以不用。
4. **準備文字編輯器**  
   - VS Code、Notepad++ 都可，負責改設定檔。

---

## 🧘‍♀️ Step by Step／電腦小白起手式

1. **下載專案**  
   - 懶人：點綠色 `Code` → `Download ZIP`，解壓到例如 `C:\TS-Source`。  
   - 進階：`git clone https://github.com/你的帳號/TS-Source.git`。

2. **複製設定檔**  
   - 把 `.env.example` 複製成 `.env`。  
   - 用編輯器打開 `.env`，照註解填上必填值（尤其 `BOT_TOKEN`、`CLIENT_ID`）。

3. **（可選）建立 JSON 金鑰管理**  
   - 需要時複製 `apikeyconfig.local.example.json` → `apikeyconfig.local.json`。  
   - `.env` 與 `.json` 設定會自動合併，空白的可以先留著。

4. **打開命令列**  
   ```bash
   cd C:\TS-Source   # 換成你的路徑
   npm install
   ```

5. **啟動機器人**  
   ```bash
   node bot.js
   ```  
   終端機顯示「已登入」即成功。要停止按 `Ctrl + C`。

6. **（可選）跑測試**  
   ```bash
   npm test
   ```  
   看見 PASS ✅ 就代表基礎功能沒問題。

7. **邀請 Bot 進伺服器**  
   - 在瀏覽器貼上：`https://discord.com/oauth2/authorize?client_id=你的CLIENT_ID&permissions=8&scope=bot%20applications.commands`  
   - 選擇伺服器 → 授權。

---

## 🔐 資安守則

- `.env`、`apikeyconfig.local.json`、`memory/`、`log/` 都在 `.gitignore`，別推上遠端。
- 金鑰或 Token 若洩漏請立即重置。
- `commands/ping.js` 會對外部主機測試連線，請只授權信任的管理員使用。
- 已執行 `npm audit --production`，目前無已知漏洞，但仍建議定期 `npm audit`。
- 程式內沒有 `eval` 或動態執行；所有外部 request 皆使用逾時與錯誤攔截。

---

## 🧭 更多探索

- 想了解啟動流程 → `src/app/BotApp.js`
- 想新增 / 管理指令 → `src/core/commandRegistry.js`
- 想調整 AI 對話 → `ai/system.js`
- 想客製監控告警 → `src/monitoring/registerSystemMonitors.js`

---

## 🙏 常見問題速解

- **啟動失敗？** 重新檢查 `.env` 是否漏填或 Token 輸入錯誤。  
- **指令沒反應？** 確認 Bot 有讀取訊息的權限，Slash 指令需等同步完成（約 1~5 分鐘）。  
- **想重啟？** 終端機按 `Ctrl + C` 停止，再 `node bot.js` 啟動。  
- **仍卡住？** 帶著錯誤訊息截圖或終端機輸出，向團隊求助。

---

> 願智慧如光，照亮伺服器。祝你和 TSBOT 一切順利！ 🙌
