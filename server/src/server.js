require('./config/env').getEnv();
const app = require('./app');
const { startScheduler } = require('./services/flow.service');
const { setupTerminalWebSocket } = require('./services/terminal.service');
const port = Number(process.env.PORT || 3000);

const server = app.listen(port, () => {
  startScheduler();
  console.log(`API Vault server listening on ${port}`);
});

setupTerminalWebSocket(server);
