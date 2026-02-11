const express = require("express");
const router = express.Router();
const controller = require("../controllers/scheduleController");

router.post("/generate", controller.generateSchedule);
router.post("/send-generated", controller.sendGeneratedSchedule);
router.get("/download", controller.downloadSchedule);
router.post("/override", controller.overrideSchedule);
router.get("/", controller.getSchedules);
router.post("/", controller.createSchedule);
router.put("/:id", controller.updateSchedule);
router.delete("/:id", controller.deleteSchedule);

module.exports = router;
