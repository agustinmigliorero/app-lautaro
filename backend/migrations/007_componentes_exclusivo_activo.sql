-- ComponentesDispositivos: un componente solo puede estar "activo" (sin fecha_baja) en un solo dispositivo a la vez.
-- Implementación con columna generada para simular unique parcial (MySQL permite múltiples NULL en índices únicos).
-- Nota: evitar el caracter punto y coma en comentarios.

ALTER TABLE ComponentesDispositivos
  ADD COLUMN activo_unico TINYINT
    GENERATED ALWAYS AS (IF(fecha_baja IS NULL, 1, NULL)) STORED;

CREATE UNIQUE INDEX ux_componentesdispositivos_componente_activo
  ON ComponentesDispositivos (id_componente, activo_unico);

