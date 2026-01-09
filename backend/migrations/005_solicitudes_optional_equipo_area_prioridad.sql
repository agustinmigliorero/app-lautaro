-- Solicitudes: equipo opcional, área opcional, prioridad.
-- Nota: evitamos poner el caracter punto y coma en comentarios porque el runner separa statements por ese caracter.

-- 1) id_equipo pasa a ser NULLable
ALTER TABLE Solicitudes
  MODIFY COLUMN id_equipo INT NULL;

-- 2) Agregar id_area (contexto de la solicitud)
ALTER TABLE Solicitudes
  ADD COLUMN id_area INT NULL AFTER usuario_asignado;

ALTER TABLE Solicitudes
  ADD CONSTRAINT fk_solicitudes_area
  FOREIGN KEY (id_area) REFERENCES Areas(id_area);

-- 3) Agregar prioridad
ALTER TABLE Solicitudes
  ADD COLUMN prioridad ENUM('Muy bajo','Bajo','Medio','Alto','Urgente') NOT NULL DEFAULT 'Medio'
  AFTER descripcion_falla;

-- 4) Backfill: si hay equipo, completar id_area desde el dispositivo
UPDATE Solicitudes s
JOIN Dispositivos d ON d.id_equipo = s.id_equipo
SET s.id_area = d.id_area
WHERE s.id_equipo IS NOT NULL
  AND s.id_area IS NULL;

-- 5) Índices útiles
CREATE INDEX idx_solicitudes_area_fecha ON Solicitudes (id_area, fecha);
CREATE INDEX idx_solicitudes_prioridad_fecha ON Solicitudes (prioridad, fecha);

