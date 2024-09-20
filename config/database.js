const { Pool } = require("pg");
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "leave-management",
  password: "admin123",
  port: 5432,
  ssl: false,
});
pool.on("connect", () => {
  console.log("Connected to the database");
});
module.exports = pool;
