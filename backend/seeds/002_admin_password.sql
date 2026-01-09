-- Forzar password del admin para entorno dev (admin123)
UPDATE Usuarios
SET password_hash = '$2b$10$aWgDCS/1ZXYhSezEGudJ6.Hu.lQLgPm49pim6dQOAL9g4//BXbggq'
WHERE nombre_usuario = 'admin';


