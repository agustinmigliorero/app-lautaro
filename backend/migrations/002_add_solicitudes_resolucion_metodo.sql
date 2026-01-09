-- Agrega método de resolución a Solicitudes
-- Valores: Laboratorio, Telefónica, Remota, Desplazamiento

ALTER TABLE Solicitudes
  ADD COLUMN resolucion_metodo ENUM('Laboratorio','Telefónica','Remota','Desplazamiento') NULL
  AFTER id_diagnostico;

