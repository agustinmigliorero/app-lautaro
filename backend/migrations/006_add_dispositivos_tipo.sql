-- Dispositivos: agrega tipo (ENUM) para clasificar el equipo.
-- Nota: evitar el caracter punto y coma en comentarios.

ALTER TABLE Dispositivos
  ADD COLUMN tipo ENUM('Celular','Notebook','Conectividad','Impresora','UPS','PC Escritorio','Otro') NOT NULL DEFAULT 'Otro'
  AFTER id_equipo;

