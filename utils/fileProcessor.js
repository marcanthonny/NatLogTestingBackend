const xlsx = require('xlsx');

const processFileData = (fileData, fileName, fileType, category) => {
  const workbook = xlsx.read(fileData, { type: 'buffer' });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  const headers = jsonData[0];
  const rows = jsonData.slice(1).map(row => {
    const rowData = {};
    headers.forEach((header, index) => {
      if (header) {
        rowData[header] = row[index];
      }
    });
    return rowData;
  });
  
  return { fileName, fileType, columns: headers, data: rows, category };
};

module.exports = { processFileData };
