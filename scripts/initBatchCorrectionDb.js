const mongoose = require('mongoose');
const BatchCorrection = require('../models/BatchCorrection');

async function initializeBatchCorrectionCollection() {
  try {
    console.log('[MongoDB] Checking batch corrections collection...');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes('batchcorrections')) {
      console.log('[MongoDB] Creating batch corrections collection...');
      
      await mongoose.connection.db.createCollection('batchcorrections', {
        validator: {
          $jsonSchema: {
            bsonType: "object",
            required: [
              "date", "doNumber", "materialCode", "quantity",
              "materialDescription", "batchSystem", "physicalBatch",
              "expiredDateSystem", "physicalExpiredDate", "userPickerCode"
            ],
            properties: {
              date: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              doNumber: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              materialCode: {
                bsonType: "string",
                description: "must be a string and is required" 
              },
              quantity: {
                bsonType: "number",
                description: "must be a number and is required"
              },
              materialDescription: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              batchSystem: {
                bsonType: "string", 
                description: "must be a string and is required"
              },
              physicalBatch: {
                bsonType: "string",
                description: "must be a string and is required"
              },
              expiredDateSystem: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              physicalExpiredDate: {
                bsonType: "date",
                description: "must be a date and is required"
              },
              userPickerCode: {
                bsonType: "string",
                description: "must be a string and is required"
              }
            }
          }
        }
      });

      await mongoose.connection.db.collection('batchcorrections').createIndex(
        { doNumber: 1 },
        { unique: true }
      );

      console.log('[MongoDB] Batch corrections collection initialized successfully');
    }

    return { success: true };
  } catch (error) {
    console.error('[MongoDB] Error initializing batch corrections collection:', error);
    throw error;
  }
}

module.exports = { initializeBatchCorrectionCollection };
