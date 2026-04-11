const LINE_COLOR_MAP = {
  '1': '#E6002A',
  '2': '#8FC31F',
  '3': '#FCD600',
  '4': '#5A2B8D',
  '5': '#B35A1F',
  '6': '#D0970A',
  '7': '#F28C00',
  '8': '#008E53',
  '9': '#7D3F98',
  '10': '#0099D8',
  '11': '#871C2A',
  '12': '#007A60',
  '13': '#E895C1',
  '14': '#6E4A2A',
  '15': '#C7A317',
  '16': '#98D1C0',
  '17': '#B6BF00',
  '18': '#C06C84',
  '41': '#B55E1D',
  '51': '#7F8C8D',
  cf: '#009999',
  cxf: '#009999',
  jstl: '#4A5568',
}

function normalizeLineNo(lineNo = '') {
  return String(lineNo || '').trim().toLowerCase()
}

function lineLabelToNo(lineLabel = '') {
  const normalized = String(lineLabel || '').trim()
  if (!normalized) return ''
  if (normalized === '浦江线') return '41'
  if (normalized === '市域机场线') return '51'
  if (normalized === '磁浮线') return 'cf'
  if (normalized === '金山铁路') return 'jstl'
  const match = normalized.match(/^(\d+)号线$/)
  return match ? String(parseInt(match[1], 10)) : ''
}

function getLineColor(lineNoOrLabel = '') {
  const normalized = normalizeLineNo(lineNoOrLabel)
  if (LINE_COLOR_MAP[normalized]) {
    return LINE_COLOR_MAP[normalized]
  }
  const lineNo = lineLabelToNo(lineNoOrLabel)
  return LINE_COLOR_MAP[normalizeLineNo(lineNo)] || '#667085'
}

function getLineTextColor(lineNoOrLabel = '') {
  const color = getLineColor(lineNoOrLabel).replace('#', '')
  if (color.length !== 6) {
    return '#FFFFFF'
  }
  const r = parseInt(color.slice(0, 2), 16)
  const g = parseInt(color.slice(2, 4), 16)
  const b = parseInt(color.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.68 ? '#1F2329' : '#FFFFFF'
}

function getLineChipStyle(lineNo, lineLabel = '') {
  const base = lineNo || lineLabel
  const background = getLineColor(base)
  const color = getLineTextColor(base)
  return `background:${background};color:${color};`
}

function buildLineChip(lineNo = '', lineLabel = '') {
  const label = lineLabel || (lineNo ? `${lineNo}号线` : '')
  return {
    lineNo: lineNo || lineLabelToNo(label),
    lineLabel: label,
    style: getLineChipStyle(lineNo, label),
  }
}

function buildLineChips(lineNos = [], lineLabels = []) {
  const chips = []
  for (let index = 0; index < lineLabels.length; index += 1) {
    chips.push(buildLineChip(lineNos[index] || '', lineLabels[index]))
  }
  return chips
}

module.exports = {
  buildLineChip,
  buildLineChips,
  getLineChipStyle,
  getLineColor,
}
