const express = require('express');
const app = express();

app.use(express.json({ limit: '3mb' }));  // Increase JSON limit
app.use(express.urlencoded({ extended: true, limit: '3mb' }));  // Increase URL-encoded limit

// Add new upload routes
app.use('/upload', require('./routes/upload'));

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});