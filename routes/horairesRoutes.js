const express = require("express");
const router = express.Router();
const {
  getHoraires,
  getHoraireById,
  createHoraire,
  updateHoraire,
  deleteHoraire,
} = require("../controllers/horairesController");

// Routes pour les horaires
router.get("/", getHoraires); // Obtenir tous les horaires
router.get("/:id", getHoraireById); // Obtenir un horaire par ID
router.post("/", createHoraire); // Ajouter un nouvel horaire
router.put("/:id", updateHoraire); // Mettre à jour un horaire
router.delete("/:id", deleteHoraire); // Supprimer un horaire

module.exports = router;
