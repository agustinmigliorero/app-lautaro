CREATE TABLE Areas (
    id_area INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);

CREATE TABLE Componentes (
    id_componente INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('Hardware', 'Software', 'Periférico') NOT NULL,
    detalle TEXT
);

CREATE TABLE Dispositivos (
    id_equipo INT AUTO_INCREMENT PRIMARY KEY,
    descripcion VARCHAR(150),
    id_area INT NOT NULL,
    nro_patrimonio VARCHAR(50) UNIQUE,
    FOREIGN KEY (id_area) REFERENCES Areas(id_area)
);

CREATE TABLE Usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    apellido_nombre VARCHAR(150) NOT NULL,
    nombre_usuario VARCHAR(100) UNIQUE NOT NULL,
    perfil_rol VARCHAR(50),
    habilitado BOOLEAN DEFAULT TRUE
    id_area INT NOT NULL,
    FOREIGN KEY (id_area) REFERENCES Areas(id_area)
);

CREATE TABLE Diagnostico (
    id_diagnostico INT AUTO_INCREMENT PRIMARY KEY,
    descripcion TEXT NOT NULL
);

CREATE TABLE Solicitudes (
    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATETIME NOT NULL,
    descripcion_falla TEXT NOT NULL,
    usuario_solicitud INT NOT NULL,
    usuario_generador INT NOT NULL,
    usuario_asignado INT,
    id_equipo INT NOT NULL,
    estado ENUM('Iniciada', 'En Proceso', 'Finalizada') NOT NULL,
    -- Diagnóstico opcional (solo al cerrar)
    id_diagnostico INT NULL,
    FOREIGN KEY (usuario_solicitud) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (usuario_generador) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (usuario_asignado) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (id_equipo) REFERENCES Dispositivos(id_equipo),
    FOREIGN KEY (id_diagnostico) REFERENCES Diagnostico(id_diagnostico)
);

CREATE TABLE Eventos (
    id_evento INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitud INT NOT NULL,
    fecha_evento DATETIME NOT NULL,
    observaciones TEXT,
    id_usuario INT NOT NULL,
    FOREIGN KEY (id_solicitud) REFERENCES Solicitudes(id_solicitud),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);

CREATE TABLE ComponentesDispositivos (
    id_equipo INT NOT NULL,
    id_componente INT NOT NULL,
    fecha_asignacion DATE NOT NULL,
    fecha_baja DATE,
    PRIMARY KEY (id_equipo, id_componente),
    FOREIGN KEY (id_equipo) REFERENCES Dispositivos(id_equipo),
    FOREIGN KEY (id_componente) REFERENCES Componentes(id_componente)
);