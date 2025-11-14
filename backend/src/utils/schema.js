// src/utils/schema.js
import { pool } from "../db.js";

export async function ensurePrepedidoSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prepedidos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_usuario_id INT NULL,
      cliente_nombre VARCHAR(120) NULL,
      cliente_email VARCHAR(150) NULL,
      cliente_telefono VARCHAR(50) NULL,
      fecha_entrega DATE NOT NULL,
      hora_entrega TIME NOT NULL,
      tipo_entrega VARCHAR(20) NOT NULL,
      estado VARCHAR(40) NOT NULL DEFAULT 'pendiente',
      direccion_entrega VARCHAR(255) NULL,
      observaciones TEXT NULL,
      requiere_aprobacion TINYINT(1) NOT NULL DEFAULT 0,
      confirm_pin VARCHAR(10) NULL,
      confirm_expires_at DATETIME NULL,
      pedido_id INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create prepedido_items table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prepedido_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prepedido_id INT NOT NULL,
      producto_id INT NOT NULL,
      unidad VARCHAR(5) NOT NULL,
      cantidad DECIMAL(10,3) NOT NULL,
      CONSTRAINT fk_prepedido_items_prepedido
        FOREIGN KEY (prepedido_id) REFERENCES prepedidos(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}
