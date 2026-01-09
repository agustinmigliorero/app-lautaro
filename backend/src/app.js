const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const { errorHandler } = require("./middlewares/errorHandler");
const { authRouter } = require("./modules/auth/auth.router");
const {
  solicitudesRouter,
} = require("./modules/solicitudes/solicitudes.router");
const { usuariosRouter } = require("./modules/usuarios/usuarios.router");
const { areasRouter } = require("./modules/areas/areas.router");
const {
  dispositivosRouter,
} = require("./modules/dispositivos/dispositivos.router");
const {
  diagnosticosRouter,
} = require("./modules/diagnosticos/diagnosticos.router");
const { componentesRouter } = require("./modules/componentes/componentes.router");

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (req, res) => {
    res.json({ ok: true });
  });

  // Rutas por módulos (se agregan en los próximos TODOs)
  app.use("/auth", authRouter);
  app.use("/usuarios", usuariosRouter);
  app.use("/areas", areasRouter);
  app.use("/dispositivos", dispositivosRouter);
  app.use("/componentes", componentesRouter);
  app.use("/diagnosticos", diagnosticosRouter);
  app.use("/solicitudes", solicitudesRouter);

  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
