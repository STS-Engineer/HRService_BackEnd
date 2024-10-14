const { Pool } = require("pg");
const pool = new Pool({
  user: "adminavo",
  host: "avo-adb-001.postgres.database.azure.com",
  database: "leave-management",
  password: "$#fKcdXPg4@ue8AW",
  port: 5432,
  ssl: true,
});
pool.on("connect", () => {
  console.log("Connected to the database");
});
module.exports = pool;
