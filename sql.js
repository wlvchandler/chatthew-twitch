require('dotenv').config()


const mariadb = require('mariadb');

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    connectionLimit: 5,
    database: process.env.DB_BASE
});

// generic query function
async function query(sql, params=[], meta=false) {
    let conn;
    try {
        conn = await pool.getConnection();
        var result = await conn.query(sql, params);
    } catch(err) {
        console.log(err);
    } finally {
        if (conn) {
            conn.end();
        }
        return new Promise((resolve, reject) => {
            if (!meta) {
                delete result.meta;
            }
            resolve(result);
        });
    }
}


module.exports = { query };
