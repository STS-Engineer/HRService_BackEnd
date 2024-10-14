const pool = require("../config/database");

class SalaryCertificate {
  static async create(userId, fileName, fileData, mimeType) {
    try {
      const result = await pool.query(
        "INSERT INTO salary_certificates (user_id, file_name, file_data, mime_type, upload_date) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
        [userId, fileName, fileData, mimeType]
      );
      return result.rows[0];
    } catch (error) {
      console.error("Error saving salary certificate:", error);
      throw error;
    }
  }
}

module.exports = SalaryCertificate;
