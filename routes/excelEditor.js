const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Set up Excel Editor uploads directory
const excelUploadsDir = path.join(__dirname, '..', 'uploads', 'excel-editor');
if (!fs.existsSync(excelUploadsDir)) {
  fs.mkdirSync(excelUploadsDir, { recursive: true });
}

// Handle formula application
router.post('/apply-formula', (req, res) => {
  try {
    const { sourceColumn, conditionType, conditionValue, trueValue, falseValue, targetColumn, data } = req.body;
    
    const processedData = data.map(row => {
      const newRow = { ...row };
      const sourceValue = row[sourceColumn];
      let result;

      switch (conditionType) {
        case 'equals':
          result = sourceValue == conditionValue;
          break;
        case 'notEquals':
          result = sourceValue != conditionValue;
          break;
        case 'greaterThan':
          result = sourceValue > conditionValue;
          break;
        case 'lessThan':
          result = sourceValue < conditionValue;
          break;
        case 'contains':
          result = String(sourceValue).includes(conditionValue);
          break;
        default:
          result = false;
      }

      newRow[targetColumn] = result ? trueValue : falseValue;
      return newRow;
    });

    res.json({
      data: processedData,
      columns: [...new Set([...Object.keys(data[0] || {}), targetColumn])]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle column formatting
router.post('/change-format', (req, res) => {
  try {
    const { column, targetFormat, data } = req.body;
    
    const processedData = data.map(row => {
      const newRow = { ...row };
      const value = row[column];

      switch (targetFormat) {
        case 'number':
          newRow[column] = Number(value) || null;
          break;
        case 'string':
          newRow[column] = value?.toString() || '';
          break;
        case 'date':
          const date = new Date(value);
          newRow[column] = date instanceof Date && !isNaN(date) ? date.toISOString() : null;
          break;
        default:
          newRow[column] = value;
      }

      return newRow;
    });

    res.json({
      data: processedData,
      columns: Object.keys(data[0] || {})
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle filtering
router.post('/filter-data', (req, res) => {
  try {
    const { filters, data } = req.body;
    
    const filteredData = data.filter(row => {
      return filters.every(filter => {
        const value = row[filter.column];
        
        switch (filter.operator) {
          case 'equals':
            return value == filter.value;
          case 'notEquals':
            return value != filter.value;
          case 'contains':
            return String(value).includes(filter.value);
          case 'notContains':
            return !String(value).includes(filter.value);
          case 'empty':
            return !value;
          case 'notEmpty':
            return !!value;
          default:
            return true;
        }
      });
    });

    res.json({
      data: filteredData,
      columns: Object.keys(data[0] || {}),
      filteredCount: filteredData.length,
      totalCount: data.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
