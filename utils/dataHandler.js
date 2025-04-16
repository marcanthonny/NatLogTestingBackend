const path = require('path');
const fs = require('fs').promises;

class DataHandler {
  constructor() {
    this.data = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      // Try to load data from file
      const filePath = path.join(__dirname, '../snapshots/index.json');
      const fileData = await fs.readFile(filePath, 'utf8');
      this.data = JSON.parse(fileData);
    } catch (error) {
      console.warn('Could not load data file:', error.message);
      this.data = [];
    }

    this.initialized = true;
  }

  async getSnapshots() {
    await this.init();
    return this.data;
  }

  async addSnapshot(snapshot) {
    await this.init();
    this.data.push(snapshot);
    
    try {
      await this.saveToFile();
    } catch (error) {
      console.warn('Could not save to file:', error.message);
    }
    
    return snapshot;
  }

  async saveToFile() {
    const filePath = path.join(__dirname, '../snapshots/index.json');
    await fs.writeFile(filePath, JSON.stringify(this.data, null, 2), 'utf8');
  }
}

module.exports = new DataHandler();
