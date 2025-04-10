const pool = require("../config/database");

// Obtenir tous les horaires
const getHoraires = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM horaires ORDER BY id ASC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Obtenir un horaire par ID
const getHoraireById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM horaires WHERE id = $1", [
      id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Horaire non trouvé" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Ajouter un nouvel horaire
const createHoraire = async (req, res) => {
  const {
    nom,
    heure_debut,
    heure_fin,
    marque_retard = 0,
    marque_depart_anticipe = 0,
    debut_entree,
    fin_entree,
    debut_sortie,
    fin_sortie,
    jours_travailles = 0,
    minutes_travaillees = 0,
  } = req.body;

  if (!nom || !heure_debut || !heure_fin) {
    return res.status(400).json({
      message: "Les champs nom, heure_debut et heure_fin sont requis.",
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO horaires (nom, heure_debut, heure_fin, marque_retard, marque_depart_anticipe, 
            debut_entree, fin_entree, debut_sortie, fin_sortie, jours_travailles, minutes_travaillees) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        nom,
        heure_debut,
        heure_fin,
        parseInt(marque_retard, 10) || 0,
        parseInt(marque_depart_anticipe, 10) || 0,
        debut_entree,
        fin_entree,
        debut_sortie,
        fin_sortie,
        parseInt(jours_travailles, 10) || 0,
        parseInt(minutes_travaillees, 10) || 0,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Mettre à jour un horaire
const updateHoraire = async (req, res) => {
  const { id } = req.params;
  const {
    nom,
    heure_debut,
    heure_fin,
    marque_retard,
    marque_depart_anticipe,
    debut_entree,
    fin_entree,
    debut_sortie,
    fin_sortie,
    jours_travailles,
    minutes_travaillees,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE horaires SET nom=$1, heure_debut=$2, heure_fin=$3, marque_retard=$4, marque_depart_anticipe=$5, 
            debut_entree=$6, fin_entree=$7, debut_sortie=$8, fin_sortie=$9, jours_travailles=$10, minutes_travaillees=$11 
            WHERE id=$12 RETURNING *`,
      [
        nom,
        heure_debut,
        heure_fin,
        parseInt(marque_retard, 10) || 0,
        parseInt(marque_depart_anticipe, 10) || 0,
        debut_entree,
        fin_entree,
        debut_sortie,
        fin_sortie,
        parseInt(jours_travailles, 10) || 0,
        parseInt(minutes_travaillees, 10) || 0,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Horaire non trouvé" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// Supprimer un horaire
const deleteHoraire = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM horaires WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Horaire non trouvé" });
    }
    res.json({ message: "Horaire supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  getHoraires,
  getHoraireById,
  createHoraire,
  updateHoraire,
  deleteHoraire,
};
