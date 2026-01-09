-- ComponentesDispositivos: permitir múltiples asignaciones históricas del mismo componente al mismo equipo.
-- Se reemplaza PK compuesta (id_equipo,id_componente) por PK autoincremental.
-- Importante: antes de soltar la PK compuesta, creamos un índice sobre las columnas usadas por las FK.
-- Nota: evitar el caracter punto y coma en comentarios.

CREATE INDEX idx_cd_equipo_componente ON ComponentesDispositivos (id_equipo, id_componente);

ALTER TABLE ComponentesDispositivos
  ADD COLUMN id_asignacion INT NOT NULL AUTO_INCREMENT FIRST,
  ADD UNIQUE KEY ux_cd_id_asignacion (id_asignacion);

ALTER TABLE ComponentesDispositivos
  DROP PRIMARY KEY,
  ADD PRIMARY KEY (id_asignacion);

