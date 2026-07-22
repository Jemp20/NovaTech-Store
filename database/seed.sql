USE novatech_store;

INSERT INTO categorias (nombre, slug) VALUES
('Laptops', 'laptops'),
('Celulares', 'celulares'),
('Audio', 'audio'),
('Accesorios', 'accesorios');

INSERT INTO productos (nombre, descripcion, precio, stock, imagen, categoria_id) VALUES
('MacBook Pro M4', 'Laptop de alto rendimiento con chip M4', 8999000, 10, 'images/products/placeholder.webp', 1),
('iPhone 16 Pro', 'Smartphone premium con cámara profesional', 6499000, 15, 'images/products/placeholder.webp', 2),
('AirPods Pro', 'Audífonos inalámbricos con cancelación de ruido', 1299000, 25, 'images/products/placeholder.webp', 3);