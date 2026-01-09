-- Datos demo mínimos para probar tickets

INSERT INTO Dispositivos (descripcion, id_area, nro_patrimonio)
SELECT 'PC Oficina', (SELECT id_area FROM Areas WHERE nombre='Soporte' LIMIT 1), 'AZ-0001'
WHERE NOT EXISTS (SELECT 1 FROM Dispositivos WHERE nro_patrimonio='AZ-0001');


