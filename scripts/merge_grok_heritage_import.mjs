import fs from 'node:fs/promises'
import path from 'node:path'
import { parseCsv } from './lib/parseCsvLine.mjs'

const ROOT = process.cwd()
const TREES_PATH = path.join(ROOT, 'public', 'data', 'trees.json')
const FIXES_PATH = path.join(ROOT, 'data', 'import', 'heritage_coord_fixes_894c.csv')
const NEW_PATH = path.join(ROOT, 'data', 'import', 'heritage_new_trees_d528.csv')
const REPORT_PATH = path.join(ROOT, 'tmp', 'grok_merge_report.json')

const GENUS_BROAD_TYPE = {
  Quercus: 'Oaks',
  Acer: 'Maples',
  Fraxinus: 'Ashes',
  Pinus: 'Pines',
  Abies: 'Firs',
  Picea: 'Spruces',
  Cedrus: 'Cedars',
  Castanea: 'Chestnuts',
  Aesculus: 'Horse Chestnuts',
  Platanus: 'Plane Trees',
  Betula: 'Birches',
  Alnus: 'Alders',
  Salix: 'Willows',
  Nothofagus: 'Southern Beeches',
  Araucaria: 'Monkey Puzzle',
  Taxus: 'Yews',
  Ilex: 'Hollies',
  Ulmus: 'Elms',
  Juglans: 'Walnuts',
  Larix: 'Larches',
  Cupressus: 'Cypresses',
  Sequoia: 'Redwoods',
  Sequoiadendron: 'Redwoods',
  Magnolia: 'Magnolias',
  Morus: 'Mulberries',
  Dicksonia: 'Tree Ferns',
  Populus: 'Willows',
  Tilia: 'Maples',
  Crataegus: 'Hollies',
  Cryptomeria: 'Cypresses',
  Eucalyptus: 'Southern Beeches',
  Acacia: 'Southern Beeches',
  Prunus: 'Maples',
  Podocarpus: 'Southern Beeches',
  Luma: 'Southern Beeches',
  Phoenix: 'Southern Beeches',
  Griselinia: 'Southern Beeches',
  Phyllocladus: 'Southern Beeches',
  Cinnamomum: 'Southern Beeches',
}

function normalizeCounty(raw) {
  const trimmed = (raw ?? '').trim()
  const paren = trimmed.indexOf(' (')
  return (paren >= 0 ? trimmed.slice(0, paren) : trimmed).trim()
}

function formatSiteName(siteName, county) {
  const base = siteName.trim()
  const suffix = `, Co. ${county}`
  if (base.toLowerCase().includes('co.')) return base
  return `${base}${suffix}`
}

function updateSiteCounty(siteName, county) {
  const without = siteName.replace(/,\s*Co\.\s*[^,]+$/i, '').trim()
  return formatSiteName(without, county)
}

function buildTaxonBroadTypeMap(trees) {
  const map = new Map()
  for (const tree of trees) {
    if (tree.taxonName && tree.broadType) {
      map.set(tree.taxonName.toLowerCase(), tree.broadType)
    }
  }
  return map
}

function inferBroadType(taxonName, taxonMap) {
  const key = (taxonName ?? '').toLowerCase().trim()
  if (taxonMap.has(key)) return taxonMap.get(key)
  const genus = (taxonName ?? '').split(/[\s(=]/)[0]
  return GENUS_BROAD_TYPE[genus] ?? ''
}

async function main() {
  const trees = JSON.parse(await fs.readFile(TREES_PATH, 'utf8'))
  const byId = new Map(trees.map((t) => [t.id, t]))
  const taxonMap = buildTaxonBroadTypeMap(trees)

  const fixesCsv = await fs.readFile(FIXES_PATH, 'utf8')
  const fixRows = parseCsv(fixesCsv)

  const coordUpdates = []
  for (const row of fixRows) {
    const ids = row.existingId.split(';').map((id) => id.trim()).filter(Boolean)
    const lat = Number(row.lat)
    const lng = Number(row.lng)
    const county = normalizeCounty(row.county)
    for (const id of ids) {
      const tree = byId.get(id)
      if (!tree) {
        console.warn(`coord fix: missing id ${id}`)
        continue
      }
      tree.lat = lat
      tree.lng = lng
      tree.coordinateStatus = 'site_geocoded'
      tree.geocodeSource = 'manual'
      if (county && county !== tree.county) {
        tree.county = county
        tree.siteName = updateSiteCounty(tree.siteName, county)
      }
      coordUpdates.push(id)
    }
  }

  const newCsv = await fs.readFile(NEW_PATH, 'utf8')
  const newRows = parseCsv(newCsv)
  const existingIds = new Set(trees.map((t) => t.id))

  function normKey(site, taxon, county) {
    return `${(site ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')}|${(taxon ?? '').toLowerCase()}|${(county ?? '').toLowerCase()}`
  }
  const existingKeys = new Set(
    trees.map((t) => normKey(t.siteName, t.taxonName, t.county))
  )

  const added = []
  const skipped = []

  for (const row of newRows) {
    const id = String(row.registerRecord).trim()
    if (existingIds.has(id)) {
      skipped.push({ id, reason: 'id_exists' })
      continue
    }
    const county = normalizeCounty(row.county)
    const siteName = formatSiteName(row.siteName, county)
    const key = normKey(siteName, row.taxonName, county)
    if (existingKeys.has(key)) {
      skipped.push({ id, reason: 'duplicate_site_taxon' })
      continue
    }

    const lat = Number(row.lat)
    const lng = Number(row.lng)
    const record = {
      id,
      lat,
      lng,
      commonName: row.commonName.trim(),
      taxonName: row.taxonName.trim(),
      siteName,
      county,
      broadType: inferBroadType(row.taxonName, taxonMap),
      heritageType: (row.heritageType ?? '').trim(),
      category: (row.category ?? '').trim(),
      form: (row.form ?? '').trim(),
      condition: (row.condition ?? '').trim(),
      ageRange: (row.ageRange ?? '').trim(),
      evidence: (row.evidence ?? '').trim() || 'Tree Council Heritage Trees of Ireland register',
      coordinateStatus: 'site_geocoded',
      geocodeSource: 'heritage_register',
    }
    trees.push(record)
    existingIds.add(id)
    existingKeys.add(key)
    added.push(id)
  }

  trees.sort((a, b) => Number(a.id) - Number(b.id))

  await fs.writeFile(TREES_PATH, JSON.stringify(trees, null, 2), 'utf8')

  const report = {
    coordFixIds: [...new Set(coordUpdates)],
    coordFixCount: coordUpdates.length,
    addedCount: added.length,
    skipped,
    totalRecords: trees.length,
    mappable: trees.filter((t) => typeof t.lat === 'number' && typeof t.lng === 'number').length,
  }
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true })
  await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
