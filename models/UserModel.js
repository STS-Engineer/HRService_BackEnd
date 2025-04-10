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
    email,
    password,
    role,
    department_id,
    line_id,
    shift_id,
  } = userData;
  return pool.query(
    `INSERT INTO users (firstname, lastname, function, email, password, role , department_id,line_id,shift_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7 , $8 , $9) RETURNING *`,
    [
      firstname,
      lastname,
      userFunction,
      email,
      password,
      role,
      department_id,
      line_id,
      shift_id,
    ]
  );
};

const updateUser = (id, userData) => {
  const {
    firstname,
    lastname,
    function: userFunction,
    department,
    department_id,
    email,
    role,
  } = userData;
  return pool.query(
    `UPDATE users 
     SET firstname = $1, lastname = $2, function = $3, department = $4, email = $5, role = $6 , department_id = $7 ,
     WHERE id = $8 RETURNING *`,
    [
      firstname,
      lastname,
      userFunction,
      department,
      department_id,
      email,
      role,
      id,
    ]
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
