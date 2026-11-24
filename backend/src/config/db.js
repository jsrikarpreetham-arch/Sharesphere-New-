
const mysql = require('mysql2/promise');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
console.log("MySQL Credential Check:", {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    passwordLength: process.env.DB_PASSWORD?.length,
    passwordHasHash: process.env.DB_PASSWORD?.includes('#'),
    passwordHasWhitespace: /\s/.test(
        process.env.DB_PASSWORD || ''
    )
});


db.getConnection()
    .then(connection => {
        console.log("MySQL Database Connected Successfully!");
        connection.release();
    })
    .catch(error => {
        console.log("MySQL Connection Failed!");
        console.log("Error Code:", error.code);
        console.log("Error Message:", error.message);
    });

module.exports = db;
