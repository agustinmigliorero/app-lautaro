const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.string().optional().default("development"),
  PORT: z.coerce.number().int().positive().optional().default(3001),

  // Defaults para dev local (para que puedas arrancar sin pelearte con .env al principio)
  DB_HOST: z.string().min(1).optional().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().optional().default(3306),
  DB_USER: z.string().min(1).optional().default("root"),
  DB_PASSWORD: z.string().optional().default(""),
  DB_NAME: z.string().min(1).optional().default("prueba_db_lautaro"),

  JWT_SECRET: z
    .string()
    .min(16)
    .optional()
    .default("dev_secret_change_me_please"),
  JWT_EXPIRES_IN: z.string().min(1).optional().default("8h"),
});

const env = envSchema.parse(process.env);

if (
  env.NODE_ENV === "production" &&
  env.JWT_SECRET === "dev_secret_change_me_please"
) {
  throw new Error("JWT_SECRET must be set in production");
}

module.exports = { env };
