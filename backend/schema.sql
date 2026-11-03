   CREATE TABLE IF NOT EXISTS users (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) NOT NULL UNIQUE,
     password_hash VARCHAR(255) NOT NULL,
     role ENUM('user','admin') NOT NULL DEFAULT 'user',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

   CREATE TABLE IF NOT EXISTS rooms (
     id INT AUTO_INCREMENT PRIMARY KEY,
     room_number VARCHAR(20) NOT NULL UNIQUE,
     type VARCHAR(50) NOT NULL,
     price_per_night DECIMAL(8,2) NOT NULL,
     capacity INT NOT NULL,
     description VARCHAR(255) NULL,
     available_from DATE NULL,
     available_until DATE NULL,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

   CREATE TABLE IF NOT EXISTS bookings (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT NOT NULL,
     room_id INT NOT NULL,
     check_in DATE NOT NULL,
     check_out DATE NOT NULL,
     status ENUM('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
     guests INT NOT NULL DEFAULT 1,
     special_request VARCHAR(200) NULL,
     total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
     paid TINYINT(1) NOT NULL DEFAULT 0,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id),
     FOREIGN KEY (room_id) REFERENCES rooms(id)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;