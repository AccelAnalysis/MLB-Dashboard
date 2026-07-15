import fs from 'node:fs';

const path = 'src/MLBDashboard_field_complete.jsx';
let source = fs.readFileSync(path, 'utf8');

const oldHeaders = `       'Completion Date',
       'Collected/Funded',`;
const newHeaders = `       'Completion Date',
       'Scope Revenue Allocation',
       'Amount Paid/Funded',
       'Collected/Funded Date',
       'Collected/Funded',`;

if (source.includes(oldHeaders)) {
  source = source.replace(oldHeaders, newHeaders);
} else if (!source.includes("       'Scope Revenue Allocation',")) {
  throw new Error('Unable to locate the Critical Path CSV financial headers.');
}

const rowSequence = `        scope?.completionDate || '',
        scope?.allocatedAmount ?? '',
        project.amountCollected ?? '',
        project.collectedDate || '',
        project.collected ? 'Yes' : 'No',`;
if (!source.includes(rowSequence)) {
  throw new Error('Critical Path CSV rows are missing metric-integrity financial fields.');
}

const headerCount = (source.match(/'Scope Revenue Allocation'/g) || []).length;
if (headerCount !== 1) {
  throw new Error(`Expected one Scope Revenue Allocation CSV header, found ${headerCount}.`);
}

fs.writeFileSync(path, source);
console.log('Metric integration cleanup completed.');
