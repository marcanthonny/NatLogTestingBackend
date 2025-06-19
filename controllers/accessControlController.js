const AccessControl = require('../models/AccessControl');

exports.getAccessControls = async (req, res) => {
  try {
    let ac = await AccessControl.findOne();
    if (!ac) {
      ac = await AccessControl.create({});
    }
    res.json(ac);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateAccessControls = async (req, res) => {
  try {
    let ac = await AccessControl.findOne();
    if (!ac) {
      ac = await AccessControl.create(req.body);
    } else {
      ac.set(req.body);
      await ac.save();
    }
    res.json(ac);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 