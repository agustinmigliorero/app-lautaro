-- Seed mínimo: crear área inicial y admin inicial
-- Nota: cambiá el password_hash por uno real generado con bcrypt.

INSERT INTO Areas (nombre, descripcion)
SELECT 'Soporte', 'Área de soporte'
WHERE NOT EXISTS (SELECT 1 FROM Areas WHERE nombre = 'Soporte');

-- password_hash placeholder (NO USAR EN PRODUCCIÓN)
-- Luego, cuando esté el endpoint, generamos el hash con bcrypt desde la app.
INSERT INTO Usuarios (apellido_nombre, nombre_usuario, perfil_rol, habilitado, id_area, password_hash)
SELECT
  'Administrador',
  'admin',
  'Admin',
  TRUE,
  (SELECT id_area FROM Areas WHERE nombre = 'Soporte' LIMIT 1),
  '$2b$10$aWgDCS/1ZXYhSezEGudJ6.Hu.lQLgPm49pim6dQOAL9g4//BXbggq'
WHERE NOT EXISTS (SELECT 1 FROM Usuarios WHERE nombre_usuario = 'admin');


