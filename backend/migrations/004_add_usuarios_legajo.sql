-- Agrega legajo a Usuarios (identificador interno municipal)
-- Se deja NULL para no romper datos existentes, se recomienda completarlo en backoffice.

ALTER TABLE Usuarios
  ADD COLUMN legajo VARCHAR(50) NULL AFTER nombre_usuario;

CREATE UNIQUE INDEX ux_usuarios_legajo ON Usuarios (legajo);

