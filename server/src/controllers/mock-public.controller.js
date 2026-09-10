const prisma = require('../config/database');
async function serveMock(req, res, next) {
  try {
    const routePath = req.path === '/' ? '/' : req.path.replace(/\/$/, '');
    const mock = await prisma.mockServer.findFirst({ where: { id: req.params.mockId, status: 'ACTIVE' }, include: { routes: { where: { method: req.method, path: routePath } } } });
    const route = mock?.routes[0];
    if (!route) return res.status(404).json({ success: false, message: 'Mock route not found' });
    for (const header of route.responseHeaders || []) if (header.key && header.value) res.setHeader(header.key, header.value);
    if (route.responseBody) { res.type('application/json'); return res.status(route.statusCode).send(route.responseBody); }
    return res.status(route.statusCode).end();
  } catch (error) { return next(error); }
}
module.exports = { serveMock };
