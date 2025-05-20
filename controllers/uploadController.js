const XLSX = require('xlsx');
const moment = require('moment');
const Snapshot = require('../models/Snapshot');

const VALID_BRANCHES = [
  '1982 - PT. APL JAYAPURA',
  '1981 - PT. APL KUPANG',
  '1980 - PT. APL DENPASAR',
  '1972 - PT. APL PONTIANAK',
  '1971 - PT. APL SAMARINDA',
  '1970 - PT. APL BANJARMASIN',
  '1962 - PT. APL PALU',
  '1961 - PT. APL MAKASSAR',
  '1957 - PT. APL BANDAR LAMPUNG',
  '1956 - PT. APL PALEMBANG',
  '1955 - PT. APL JAMBI',
  '1954 - PT. APL BATAM',
  '1953 - PT. APL PEKANBARU',
  '1952 - PT. APL PADANG',
  '1951 - PT. APL MEDAN',
  '1940 - PT. APL SURABAYA',
  '1932 - PT. APL YOGYAKARTA',
  '1930 - PT. APL SEMARANG',
  '1922 - PT. APL BANDUNG',
  '1921 - PT. APL TANGERANG',
  '1920 - PT. APL BOGOR',
  '1910 - PT. APL JAKARTA 1',
  '1960 - PT. APL MANADO'
];

const normalizeColumnName = (name) => {
  return String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
};

const hasNumericColumns = (columns) => {
  return columns.every(col => !isNaN(col) || col.trim() === '');
};

const branchColumnVariants = [
  'Branch', '!Branch', 'Plant', 'Lbl_Branch',
  'branch', 'plant', 'lblbranch', 'branchname',
  'plantname', 'branch_name', 'plant_name'
];

const findBranchColumn = (columns) => {
  const exactMatch = columns.find(col => branchColumnVariants.includes(col));
  if (exactMatch) return exactMatch;

  const normalizedColumns = columns.map(col => ({
    original: col,
    normalized: normalizeColumnName(col)
  }));

  const normalizedVariants = branchColumnVariants.map(v => normalizeColumnName(v));
  const normalizedMatch = normalizedColumns.find(col =>
    normalizedVariants.includes(col.normalized)
  );

  return normalizedMatch ? normalizedMatch.original : null;
};

const normalizeDataWithFirstRow = (data) => {
  if (!data || !data.data || data.data.length < 2) return data;

  const currentColumns = data.columns;
  const needsNormalization = currentColumns.every(col => 
    !isNaN(col) || col.trim() === ''
  );

  if (!needsNormalization) return data;

  const firstRow = data.data[0];
  const newColumns = currentColumns.map(col => firstRow[col] || col);
  const newData = data.data.slice(1).map(row => {
    const newRow = {};
    currentColumns.forEach((col, index) => {
      newRow[newColumns[index]] = row[col];
    });
    return newRow;
  });

  return { ...data, columns: newColumns, data: newData };
};

const processIraData = (jsonData) => {
  const columns = jsonData[0];
  const rows = jsonData.slice(1);
  const data = { columns, data: rows };
  const normalizedData = normalizeDataWithFirstRow(data);

  const branchGroups = {};
  VALID_BRANCHES.forEach(branch => {
    branchGroups[branch] = { branch, counted: 0, total: 0 };
  });

  let countedItems = 0;
  let totalItems = 0;
  const branchColumn = findBranchColumn(normalizedData.columns);

  normalizedData.data.forEach(row => {
    if (!row) return;

    const iraValue = row['%IRALine'];
    const countStatus = row['Ind_IRALine'];
    const branch = branchColumn ? row[branchColumn] : null;
    const isIraLine = iraValue === 1 || iraValue === '1' || iraValue === true || 
                      iraValue === 'true' || countStatus === 'Match';

    if (isIraLine) {
      countedItems++;
    }
    totalItems++;

    if (branch) {
      const normalizedBranch = VALID_BRANCHES.find(valid => 
        valid.includes(branch) || branch.includes(valid.split(' - ')[1])
      );

      if (normalizedBranch) {
        branchGroups[normalizedBranch].total++;
        if (isIraLine) {
          branchGroups[normalizedBranch].counted++;
        }
      }
    }
  });

  const percentage = totalItems > 0 ? (countedItems / totalItems) * 100 : 0;
  const branchPercentages = Object.values(branchGroups)
    .filter(group => group.total > 0)
    .map(group => ({
      branch: group.branch,
      percentage: (group.counted / group.total) * 100
    }));

  return {
    data: normalizedData.data,
    columns: normalizedData.columns,
    stats: {
      counted: countedItems,
      notCounted: totalItems - countedItems,
      percentage,
      branchPercentages
    }
  };
};

const processCcData = (jsonData) => {
  const columns = jsonData[0];
  const rows = jsonData.slice(1);
  const data = { columns, data: rows };
  const normalizedData = normalizeDataWithFirstRow(data);

  const branchGroups = {};
  VALID_BRANCHES.forEach(branch => {
    branchGroups[branch] = { branch, counted: 0, total: 0 };
  });

  let counted = 0;
  let notCounted = 0;

  // Process data and calculate stats
  const processedData = normalizedData.data.map(row => {
    const updatedRow = { ...row };
    if (updatedRow['Count Status'] === 'Counted' && updatedRow['%CountComp'] !== 1) {
      updatedRow['%CountComp'] = 1;
    }
    return updatedRow;
  });

  processedData.forEach(row => {
    if (!row) return;
    
    const branch = row.Branch || row['!Branch'] || row.Plant;
    const countComp = Number(row['%CountComp']);
    
    if (countComp === 1) {
      counted++;
      if (branch && VALID_BRANCHES.includes(branch)) {
        branchGroups[branch].counted++;
      }
    } else {
      notCounted++;
    }

    if (branch && VALID_BRANCHES.includes(branch)) {
      branchGroups[branch].total++;
    }
  });

  const totalItems = counted + notCounted;
  const percentage = totalItems > 0 ? (counted / totalItems) * 100 : 0;
  const branchPercentages = Object.values(branchGroups)
    .filter(group => group.total > 0)
    .map(group => ({
      branch: group.branch,
      percentage: (group.counted / group.total) * 100
    }));

  return {
    data: processedData,
    columns: normalizedData.columns,
    stats: {
      counted,
      notCounted,
      percentage,
      branchPercentages
    }
  };
};

const processFiles = async (req, res) => {
  try {
    const files = req.files;
    
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    let iraData = null;
    let ccData = null;

    // Process each file
    for (const file of files) {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Determine file type from name
      const isIra = file.originalname.toLowerCase().includes('ira');
      const isCc = file.originalname.toLowerCase().includes('cc');

      if (isIra) {
        iraData = processIraData(jsonData);
      } else if (isCc) {
        ccData = processCcData(jsonData);
      }
    }

    if (!iraData && !ccData) {
      return res.status(400).json({ success: false, error: 'No valid IRA or CC files found' });
    }

    // Create snapshot
    const snapshotDate = new Date();
    const snapshotName = moment(snapshotDate).format('MMMM-YYYY (DD)');
    
    const snapshot = await Snapshot.create({
      name: snapshotName,
      date: snapshotDate,
      iraData,
      ccData,
      iraStats: calculateStats(iraData),
      ccStats: calculateStats(ccData)
    });

    res.json({ success: true, snapshot });
  } catch (error) {
    console.error('File processing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { processFiles };