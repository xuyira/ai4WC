const LINE_COLOR_MAP = {
  '1': '#E6002A',
  '2': '#8CC220',
  '3': '#FCD600',
  '4': '#461D84',
  '5': '#944D9A',
  '6': '#D40068',
  '7': '#ED6F00',
  '8': '#0095D9',
  '9': '#87CAED',
  '10': '#C6AFD4',
  '11': '#871C2B',
  '12': '#007A60',
  '13': '#E999C0',
  '14': '#9A982F',
  '15': '#C8B38E',
  '16': '#98D1C0',
  '17': '#B6766C',
  '18': '#C09453',
  '41': '#B5B6B6',
  '51': '#BBBBBB',
  cf: '#008B9A',
  cxf: '#008B9A',
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
