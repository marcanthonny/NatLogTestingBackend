const ExcelJS = require('exceljs');

// Add branch code mapping
const BRANCH_CODES = {
  'MEDAN': '1951',
  'JAKARTA 1': '1910',
  'SEMARANG': '1930',
  'MAKASSAR': '1961',
  'BANDAR LAMPUNG': '1957',
  'PALEMBANG': '1956',
  'TANGERANG': '1921',
  'PONTIANAK': '1972',
  'BANDUNG': '1922',
  'YOGYAKARTA': '1932',
  'JAYAPURA': '1982',
  'BANJARMASIN': '1970',
  'PALU': '1962',
  'BATAM': '1954',
  'PEKANBARU': '1953',
  'KUPANG': '1981',
  'JAMBI': '1955',
  'SURABAYA': '1940',
  'BOGOR': '1920',
  'PADANG': '1952',
  'SAMARINDA': '1971',
  'DENPASAR': '1980',
  'MANADO': '1960'
};

const getBranchWithCode = (branchName) => {
  // Extract city name from "PT. APL CITY"
  const city = branchName.replace('PT. APL ', '');
  const code = BRANCH_CODES[city] || '';
  return code ? `${code} - ${branchName}` : branchName;
};

async function exportToExcel(snapshot) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Snapshot Data');

  // Set column headers
  worksheet.columns = [
    { header: 'Branch', key: 'branch', width: 40 }, // Increased width for longer branch names
    { header: 'IRA CC', key: 'iraCc', width: 15 },
    { header: 'Cycle Count', key: 'cycleCount', width: 15 }
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '4F81BD' }
  };

  // Add data rows with branch codes
  snapshot.ccStats.branchPercentages.forEach((branch, index) => {
    worksheet.addRow({
      branch: getBranchWithCode(branch.branch),
      iraCc: branch.percentage.toFixed(2).replace('.', ','),
      cycleCount: (snapshot.iraStats.branchPercentages[index]?.percentage || 0).toFixed(2).replace('.', ',')
    });
  });

  // Ensure proper number format for decimal columns
  worksheet.getColumn('iraCc').numFmt = '#,##0.00';
  worksheet.getColumn('cycleCount').numFmt = '#,##0.00';

  return workbook;
}

module.exports = { exportToExcel, getBranchWithCode };
