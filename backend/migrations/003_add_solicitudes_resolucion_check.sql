-- Asegura integridad: si la solicitud está Finalizada, debe tener diagnóstico y método de resolución.
-- Importante: antes de agregar el CHECK, saneamos datos legacy que estén "Finalizada" pero incompletos.
-- Política elegida: reabrirlas a "En Proceso" para no inventar diagnóstico/método.

UPDATE Solicitudes
SET estado = 'En Proceso'
WHERE estado = 'Finalizada'
  AND (id_diagnostico IS NULL OR resolucion_metodo IS NULL);

ALTER TABLE Solicitudes
  ADD CONSTRAINT chk_solicitudes_finalizada_requiere_diag_y_resolucion
  CHECK (
    estado <> 'Finalizada'
    OR (
      id_diagnostico IS NOT NULL
      AND resolucion_metodo IS NOT NULL
    )
  );

