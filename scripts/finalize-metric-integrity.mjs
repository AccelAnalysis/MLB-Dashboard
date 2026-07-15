import fs from 'node:fs';

const path = 'src/MLBDashboard_field_complete.jsx';
let source = fs.readFileSync(path, 'utf8');

if (!source.includes("'Scope Revenue Allocation',")) {
  const headerPattern = /^(\s*)'Completion Date',\n\1'Collected\/Funded',/m;
  const matches = source.match(headerPattern);
  if (!matches) throw new Error('Unable to locate the adjacent Critical Path CSV financial headers.');
  const indent = matches[1];
  source = source.replace(
    headerPattern,
    `${indent}'Completion Date',\n${indent}'Scope Revenue Allocation',\n${indent}'Amount Paid/Funded',\n${indent}'Collected/Funded Date',\n${indent}'Collected/Funded',`,
  );
}

const rowPattern = /scope\?\.completionDate \|\| '',\n\s*scope\?\.allocatedAmount \?\? '',\n\s*project\.amountCollected \?\? '',\n\s*project\.collectedDate \|\| '',\n\s*project\.collected \? 'Yes' : 'No',/;
if (!rowPattern.test(source)) {
  throw new Error('Critical Path CSV rows are missing metric-integrity financial fields.');
}

const headerCount = (source.match(/'Scope Revenue Allocation'/g) || []).length;
if (headerCount !== 1) {
  throw new Error(`Expected one Scope Revenue Allocation CSV header, found ${headerCount}.`);
}

fs.writeFileSync(path, source);
console.log('Metric integration cleanup completed.');
