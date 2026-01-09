-- Base schema (adaptado desde db.sql) + fixes mínimos para que compile

CREATE TABLE IF NOT EXISTS Areas (
  id_area INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS Dispositivos (
  id_equipo INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('Celular','Notebook','Conectividad','Impresora','UPS','PC Escritorio','Otro') NOT NULL DEFAULT 'Otro',
  descripcion VARCHAR(150),
  id_area INT NOT NULL,
  nro_patrimonio VARCHAR(50) UNIQUE,
  FOREIGN KEY (id_area) REFERENCES Areas(id_area)
);

CREATE TABLE IF NOT EXISTS DispositivoComponentes (
  id_componente INT AUTO_INCREMENT PRIMARY KEY,
  id_equipo INT NOT NULL,
  tipo ENUM('Hardware','Software','Periférico') NOT NULL,
  detalle TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_equipo) REFERENCES Dispositivos(id_equipo)
);

CREATE INDEX idx_dispositivo_componentes_equipo ON DispositivoComponentes (id_equipo);

CREATE TABLE IF NOT EXISTS Usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  apellido_nombre VARCHAR(150) NOT NULL,
  nombre_usuario VARCHAR(100) UNIQUE NOT NULL,
  legajo VARCHAR(50) UNIQUE,
  perfil_rol VARCHAR(50),
  habilitado BOOLEAN DEFAULT TRUE,
  id_area INT NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_area) REFERENCES Areas(id_area)
);

CREATE TABLE IF NOT EXISTS Diagnostico (
  id_diagnostico INT AUTO_INCREMENT PRIMARY KEY,
  descripcion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Solicitudes (
  id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  descripcion_falla TEXT NOT NULL,
  prioridad ENUM('Muy bajo','Bajo','Medio','Alto','Urgente') NOT NULL DEFAULT 'Medio',
  usuario_solicitud INT NOT NULL,
  usuario_generador INT NOT NULL,
  usuario_asignado INT,
  id_area INT NULL,
  id_equipo INT NULL,
  estado ENUM('Iniciada','En Proceso','Finalizada') NOT NULL DEFAULT 'Iniciada',
  id_diagnostico INT NULL,
  FOREIGN KEY (usuario_solicitud) REFERENCES Usuarios(id_usuario),
  FOREIGN KEY (usuario_generador) REFERENCES Usuarios(id_usuario),
  FOREIGN KEY (usuario_asignado) REFERENCES Usuarios(id_usuario),
  FOREIGN KEY (id_area) REFERENCES Areas(id_area),
  FOREIGN KEY (id_equipo) REFERENCES Dispositivos(id_equipo),
  FOREIGN KEY (id_diagnostico) REFERENCES Diagnostico(id_diagnostico)
);

CREATE TABLE IF NOT EXISTS Eventos (
  id_evento INT AUTO_INCREMENT PRIMARY KEY,
  id_solicitud INT NOT NULL,
  fecha_evento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observaciones TEXT,
  id_usuario INT NOT NULL,
  FOREIGN KEY (id_solicitud) REFERENCES Solicitudes(id_solicitud),
  FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);

CREATE INDEX idx_solicitudes_estado_fecha ON Solicitudes (estado, fecha);
CREATE INDEX idx_solicitudes_asignado ON Solicitudes (usuario_asignado);
CREATE INDEX idx_solicitudes_solicitante ON Solicitudes (usuario_solicitud);
CREATE INDEX idx_solicitudes_generador ON Solicitudes (usuario_generador);
CREATE INDEX idx_solicitudes_equipo ON Solicitudes (id_equipo);
CREATE INDEX idx_solicitudes_area_fecha ON Solicitudes (id_area, fecha);
CREATE INDEX idx_solicitudes_prioridad_fecha ON Solicitudes (prioridad, fecha);

CREATE INDEX idx_eventos_solicitud_fecha ON Eventos (id_solicitud, fecha_evento);


