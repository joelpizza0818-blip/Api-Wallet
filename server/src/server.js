require('./config/env').getEnv();
const app = require('./app');
const { startScheduler } = require('./services/flow.service');
const port = Number(process.env.PORT || 3000);
app.listen(port, () => { startScheduler(); console.log(`API Vault server listening on ${port}`); });
