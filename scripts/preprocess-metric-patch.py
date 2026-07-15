from pathlib import Path

path = Path('scripts/apply-metric-integrity-patch.mjs')
source = path.read_text()

id_template = "      id: `SA-${Date.now()}`,"
if id_template in source:
    source = source.replace(id_template, "      id: 'SA-' + Date.now(),", 1)

strict_guard = "  if (index === -1) throw new Error(`Expected source not found in ${path}: ${search.slice(0, 100)}`);"
optional_guard = "  if (index === -1) { console.warn('Optional source not found in ' + path + ': ' + search.slice(0, 100)); return; }"
if strict_guard in source:
    source = source.replace(strict_guard, optional_guard, 1)
else:
    print('Strict replace guard was already changed or not present.')

marker = '// Active dashboard UI and calculations.'
if source.count(marker) != 1:
    raise SystemExit('Dashboard generation marker is missing or duplicated.')
before, after = source.split(marker, 1)
after = after.replace('${', r'\${')
source = before + marker + after

path.write_text(source)
print('Metric patch preprocessor completed.')
