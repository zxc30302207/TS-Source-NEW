const BotApp = require('./BotApp');

async function startBot() {
  const app = new BotApp();
  await app.start();
}

module.exports = {
  startBot
};

