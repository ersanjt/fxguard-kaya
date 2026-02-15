const express = require('express');
const router = express.Router();

router.post('/send', async (req, res) => {
    try {
        const { recipients, message, delay } = req.body;
        if (!recipients || !Array.isArray(recipients) || !message) {
            return res.status(400).json({ error: 'recipients و message الزامی است' });
        }
        res.json({
            bulkId: 'bulk_' + Date.now(),
            total: recipients.length,
            status: 'processing'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
