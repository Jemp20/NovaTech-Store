-- Ejecutar UNA SOLA VEZ en la base de Aiven (Workbench, conexión "NovaTech Aiven")
-- Agrega lo que falta en schema.sql pero tu código ya usa.

-- 1. Columnas faltantes en productos
ALTER TABLE productos
    ADD COLUMN especificaciones JSON NULL,
    ADD COLUMN destacado TINYINT(1) NOT NULL DEFAULT 0;

-- 2. Columnas faltantes en pedidos (datos de envío)
ALTER TABLE pedidos
    ADD COLUMN telefono_contacto VARCHAR(20),
    ADD COLUMN documento_identidad VARCHAR(30),
    ADD COLUMN direccion_envio VARCHAR(255),
    ADD COLUMN ciudad_envio VARCHAR(100),
    ADD COLUMN notas_entrega TEXT,
    ADD COLUMN metodo_pago VARCHAR(50);

-- 3. Tabla de reseñas (no existía en schema.sql)
CREATE TABLE resenas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    calificacion TINYINT NOT NULL,
    comentario TEXT,
    compra_verificada BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unico_producto_usuario (producto_id, usuario_id),
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 4. Tabla de favoritos (no existía en schema.sql)
CREATE TABLE favoritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    producto_id INT NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unico_usuario_producto (usuario_id, producto_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);
