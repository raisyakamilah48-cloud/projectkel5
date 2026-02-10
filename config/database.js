const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'projectkel5'
});

connection.connect(function(err) {
  if (err) {
    console.log("Koneksi gagal:", err);
  } else {
    console.log("Database terhubung");
  }
});

module.exports = connection;
