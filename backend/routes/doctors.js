const express = require("express");
const router = express.Router();
const controller = require("../controllers/doctorController");

router.post("/", controller.createDoctor);
router.get("/", controller.getDoctors);
router.get("/:id", controller.getDoctor);
router.put("/:id", controller.updateDoctor);
router.delete("/:id", controller.deleteDoctor);

// Save push subscription for PWA notifications
router.post("/:id/push-subscription", controller.savePushSubscription);

module.exports = router;
