const prisma = require('../config/database');
async function serveMock(req, res, next) {
  try {
    const routePath = req.path === '/' ? '/' : `/${req.path.replace(/^\/+|\/+$/g, '')}`;
    const method = String(req.method || 'GET').toUpperCase();
    const mock = await prisma.mockServer.findFirst({
      where: { OR: [{ id: req.params.mockId }, { slug: req.params.mockId }], status: 'ACTIVE' },
      include: { routes: { where: { method: { in: method === 'HEAD' ? ['HEAD', 'GET'] : [method] }, path: routePath } } },
    });
    const route = mock?.routes.find((item) => item.method === method) || mock?.routes[0];
    if (!route) return res.status(404).json({ success: false, message: 'Mock route not found' });
    for (const header of route.responseHeaders || []) if (header.key && header.value) res.setHeader(header.key, header.value);
    if (route.responseBody) {
      if (!res.getHeader('content-type')) res.type('json');
      return res.status(route.statusCode).send(route.responseBody);
    }
    return res.status(route.statusCode).end();
  } catch (error) { return next(error); }
}
module.exports = { serveMock };
