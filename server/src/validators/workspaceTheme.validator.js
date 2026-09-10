const { z } = require('zod');

const hexColor = z.string().regex(/^#([A-Fa-f0-9]{6})$/);

const themeSchema = z.object({
  primary: hexColor,
  primaryHover: hexColor,
  primaryLight: hexColor,
  background: hexColor,
  surface: hexColor,
  surfaceAlt: hexColor,
  text: hexColor,
  textMuted: hexColor,
  border: hexColor,
});

function validate(req, res, next) {
  const result = themeSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid theme payload', details: result.error.errors });
  }
  next();
}

module.exports = { validate };
