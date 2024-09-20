const pool = require("../config/database");

const getAllUsers = () => {
  return pool.query("SELECT * FROM users");
};

const getUserById = (id) => {
  return pool.query("SELECT * FROM users WHERE id = $1", [id]);
};

const createUser = (userData) => {
  const {
    firstname,
    lastname,
    function: userFunction,
    department,
    email,
    password,
    role,
  } = userData;
  return pool.query(
    `INSERT INTO users (firstname, lastname, function, department, email, password, role)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [firstname, lastname, userFunction, department, email, password, role]
  );
};

const updateUser = (id, userData) => {
  const {
    firstname,
    lastname,
    function: userFunction,
    department,
    email,
    role,
  } = userData;
  return pool.query(
    `UPDATE users 
     SET firstname = $1, lastname = $2, function = $3, department = $4, email = $5, role = $6 
     WHERE id = $7 RETURNING *`,
    [firstname, lastname, userFunction, department, email, role, id]
  );
};

const deleteUser = (id) => {
  return pool.query("DELETE FROM users WHERE id = $1 RETURNING *", [id]);
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
