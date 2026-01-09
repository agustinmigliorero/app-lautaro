-- Modelo simple: los componentes pertenecen a un dispositivo (1:N).
-- Se migra el estado "activo" actual desde Componentes/ComponentesDispositivos y luego se eliminan tablas viejas.
-- Nota: evitar el caracter punto y coma en comentarios.

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

-- Migra componentes activos actuales (fecha_baja NULL)
INSERT INTO DispositivoComponentes (id_equipo, tipo, detalle)
SELECT cd.id_equipo, c.tipo, c.detalle
FROM ComponentesDispositivos cd
JOIN Componentes c ON c.id_componente = cd.id_componente
WHERE cd.fecha_baja IS NULL;

-- Eliminamos tablas del modelo anterior
DROP TABLE IF EXISTS ComponentesDispositivos;
DROP TABLE IF EXISTS Componentes;

