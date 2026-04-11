const legendItems = require('../data/legend-items')
const stationDetailMap = require('../data/station-detail-map')
const rawStationToEntity = require('../data/raw-station-to-entity')
const browseDataJson = require('../data/browse-data')
const routeSearchIndexJson = require('../data/route-search-index')
const stationSearchIndexJson = require('../data/station-search-index')
const routeMock = require('../mock/route')
const lineColors = require('../utils/line-colors')
const ROUTE_API_BASE = 'https://m.shmetro.com/interface/plantrip/pt.aspx'

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function delay(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(clone(data)), 40)
  })
}

const legendIconMap = (() => {
  const map = {}
  legendItems.forEach((item) => {
    map[item.key] = item
  })
  return map
})()

function legendTypesToIcons(legendTypes = []) {
  const seen = new Set()
  const icons = []
  legendTypes.forEach((type) => {
    if (seen.has(type) || !legendIconMap[type]) {
      return
    }
    seen.add(type)
    icons.push({
      key: type,
      label: legendIconMap[type].label,
      iconPath: legendIconMap[type].iconPath,
    })
  })
  return icons
}

function collapseLegendTypesForStation(legendTypes = []) {
  const set = new Set(legendTypes)
  const result = []

  if (set.has('inside_outside_toilet') || (set.has('inside_toilet') && set.has('outside_toilet'))) {
    result.push('inside_outside_toilet')
  } else {
    if (set.has('inside_toilet')) result.push('inside_toilet')
    if (set.has('outside_toilet')) result.push('outside_toilet')
  }

  if (
    set.has('inside_outside_accessible') ||
    (set.has('inside_accessible') && set.has('outside_accessible'))
  ) {
    result.push('inside_outside_accessible')
  } else {
    if (set.has('inside_accessible')) result.push('inside_accessible')
    if (set.has('outside_accessible')) result.push('outside_accessible')
  }

  return result
}

function normalizeRouteSearchItem(item) {
  const lineNo = item.line_no || item.lineNo
  const lineLabel = item.line_label || item.lineLabel
  return {
    stationId: item.station_id || item.stationId,
    stationEntityId: item.station_entity_id || item.stationEntityId,
    stationName: item.station_name || item.stationName,
    lineNo,
    lineLabel,
    lineChip: lineColors.buildLineChip(lineNo, lineLabel),
    displayName: item.display_name || item.displayName,
    selectedLabel: item.station_name || item.stationName,
    keywords: item.keywords || [],
  }
}

function normalizeStationSearchItem(item) {
  const legendTypes = item.legend_types || item.legendTypes || []
  const lineNos = item.line_nos || item.lineNos || []
  const lineLabels = item.line_labels || item.lineLabels || []
  return {
    stationId: item.station_id || item.stationId,
    stationName: item.station_name || item.stationName,
    lineNos,
    lineLabels,
    lineLabelText: lineLabels.join(' / '),
    lineChips: lineColors.buildLineChips(lineNos, lineLabels),
    displayName: item.display_name || item.displayName,
    keywords: item.keywords || [],
    legendTypes,
    legendIcons: legendTypesToIcons(collapseLegendTypesForStation(legendTypes)),
    preferredLineNo: lineNos[0] || '',
  }
}

function normalizeBrowseStation(item) {
  const legendTypes = item.legend_types || item.legendTypes || []
  const stationLineLabels = item.station_line_labels || item.stationLineLabels || []
  const lineNo = item.line_no || item.lineNo || ''
  const lineLabel = item.line_label || item.lineLabel || ''
  return {
    stationId: item.station_id || item.stationId,
    stationName: item.station_name || item.stationName,
    lineNo,
    lineLabel,
    lineChip: lineLabel ? lineColors.buildLineChip(lineNo, lineLabel) : null,
    stationLineLabels,
    stationLineLabelText: stationLineLabels.join(' / '),
    stationLineChips: lineColors.buildLineChips([], stationLineLabels),
    legendTypes,
    legendIcons: legendTypesToIcons(collapseLegendTypesForStation(legendTypes)),
    scopeTypes: item.scope_types || item.scopeTypes || [],
    hasFloorplan: item.has_floorplan || item.hasFloorplan || false,
    preferredLineNo: item.line_no || item.lineNo || '',
  }
}

function normalizeStationDetail(detail) {
  return {
    ...detail,
    stationId: detail.station_id || detail.stationId,
    stationName: detail.station_name || detail.stationName,
    floorplanUrl: detail.floorplan_url || detail.floorplanUrl || '',
    floorplanLocalPath: detail.floorplan_local_path || detail.floorplanLocalPath || '',
    hasFloorplan: detail.has_floorplan || detail.hasFloorplan || false,
    hasDisplayToilet: detail.has_display_toilet || detail.hasDisplayToilet || false,
    lineLabels: detail.line_labels || detail.lineLabels || [],
    lineChips: lineColors.buildLineChips(detail.lines || [], detail.line_labels || detail.lineLabels || []),
    legendTypes: detail.legend_types || detail.legendTypes || [],
    legendIcons: legendTypesToIcons(
      collapseLegendTypesForStation(detail.legend_types || detail.legendTypes || [])
    ),
    floorplanGroups: (detail.floorplan_groups || detail.floorplanGroups || []).map((group) => ({
      lineNos: group.line_nos || group.lineNos || [],
      lineLabels: group.line_labels || group.lineLabels || [],
      lineLabelText: (group.line_labels || group.lineLabels || []).join(' / '),
      lineChips: lineColors.buildLineChips(group.line_nos || group.lineNos || [], group.line_labels || group.lineLabels || []),
      floorplanUrl: group.floorplan_url || group.floorplanUrl || '',
      floorplanLocalPath: group.floorplan_local_path || group.floorplanLocalPath || '',
    })),
    toiletLineGroups: (detail.toilet_line_groups || detail.toiletLineGroups || []).map((group) => ({
      lineNo: group.line_no || group.lineNo,
      lineLabel: group.line_label || group.lineLabel,
      lineChipStyle: lineColors.getLineChipStyle(group.line_no || group.lineNo, group.line_label || group.lineLabel),
      entries: (group.entries || []).map((entry) => ({
        scopeType: entry.scope_type || entry.scopeType,
        description: entry.description,
        legendTypes: entry.legend_types || entry.legendTypes || [],
        legendIcons: legendTypesToIcons(entry.legend_types || entry.legendTypes || []),
        hasAccessibleToilet: entry.has_accessible_toilet || entry.hasAccessibleToilet || false,
        accessibleAbsent: entry.accessible_absent || entry.accessibleAbsent || false,
        icon1: entry.icon1 || '',
        icon2: entry.icon2 || '',
      })),
    })),
  }
}

function getCurrentWeekValue() {
  const day = new Date().getDay()
  return day === 0 ? '7' : String(day)
}

function lineNoToLabel(lineNo) {
  if (String(lineNo) === '41') return '浦江线'
  if (String(lineNo) === '51') return '市域机场线'
  return `${lineNo}号线`
}

function derivePrimaryLineNoFromStationId(stationId) {
  const value = String(stationId || '')
  if (!value) return ''
  if (value.startsWith('41')) return '41'
  if (value.startsWith('51')) return '51'
  const prefix = value.slice(0, 2)
  if (/^\d+$/.test(prefix)) {
    return String(parseInt(prefix, 10))
  }
  return ''
}

function getDetailByRawStationId(rawStationId) {
  const entityId = rawStationToEntity[rawStationId]
  if (!entityId) return null
  const detail = stationDetailMap[entityId]
  return detail ? normalizeStationDetail(detail) : null
}

function buildRouteSummary(route, routeIndex, startName, endName, toiletStationCount) {
  const transfers = route.transferStationList || []
  if (!transfers.length) {
    return `路线${routeIndex}：暂无路径信息，含卫生间站点 ${toiletStationCount} 个`
  }

  const segments = []
  for (let index = 0; index < transfers.length; index += 1) {
    const current = transfers[index]
    const next = transfers[index + 1]
    const segmentStart = current.stationName
    const segmentEnd = next ? next.stationName : endName
    const prefix = index === 0 ? `路线${routeIndex}：` : '换乘 '
    segments.push(`${prefix}${lineNoToLabel(current.line)}（${segmentStart} 至 ${segmentEnd}）`)
  }

  if (!segments.length) {
    segments.push(`路线${routeIndex}：${startName} 至 ${endName}`)
  }
  return `${segments.join('，')}，含卫生间站点 ${toiletStationCount} 个`
}

function mapRouteStations(route) {
  const seen = new Set()
  const result = []
  ;(route.passStationList || []).forEach((station) => {
    const detail = getDetailByRawStationId(station.stationId)
    if (!detail || !detail.hasDisplayToilet) {
      return
    }
    if (seen.has(detail.stationId)) {
      return
    }
    seen.add(detail.stationId)
    const currentLineNo = derivePrimaryLineNoFromStationId(station.stationId)
    result.push({
      stationId: detail.stationId,
      stationName: detail.stationName,
      currentLineNo,
      currentLineLabel: currentLineNo ? lineNoToLabel(currentLineNo) : '',
      stationLineLabels: detail.lineLabels,
      stationLineLabelText: detail.lineLabels.join(' / '),
      stationLineChips: detail.lineChips || [],
      legendTypes: detail.legendTypes || [],
      legendIcons: legendTypesToIcons(collapseLegendTypesForStation(detail.legendTypes || [])),
    })
  })
  return result
}

function normalizeRouteToiletStation(item) {
  const legendTypes = item.legendTypes || item.legend_types || []
  return {
    stationId: item.stationId || item.station_id,
    stationName: item.stationName || item.station_name,
    currentLineNo: item.currentLineNo || item.current_line_no || '',
    currentLineLabel: item.currentLineLabel || item.current_line_label || '',
    stationLineLabels: item.stationLineLabels || item.station_line_labels || [],
    stationLineLabelText: (item.stationLineLabels || item.station_line_labels || []).join(' / '),
    stationLineChips: lineColors.buildLineChips([], item.stationLineLabels || item.station_line_labels || []),
    legendTypes,
    legendIcons: legendTypesToIcons(collapseLegendTypesForStation(legendTypes)),
  }
}

function routeSearchScore(item, keyword) {
  if (!keyword) return 0
  const normalized = keyword.trim().toLowerCase()
  const displayName = String(item.displayName || '').toLowerCase()
  const stationName = String(item.stationName || '').toLowerCase()
  const lineLabel = String(item.lineLabel || '').toLowerCase()
  const lineNo = String(item.lineNo || '').toLowerCase()
  if (lineNo === normalized) return 120
  if (lineLabel === normalized || `${lineNo}号线` === normalized) return 110
  if (displayName.startsWith(normalized)) return 100
  if (stationName === normalized) return 95
  if (stationName.startsWith(normalized)) return 90
  if (lineLabel.includes(normalized)) return 85
  if (lineNo.includes(normalized)) return 80
  if (stationName.includes(normalized)) return 70
  if (displayName.includes(normalized)) return 60
  return 10
}

function stationSearchScore(item, keyword) {
  if (!keyword) return 0
  const normalized = keyword.trim().toLowerCase()
  const displayName = String(item.displayName || '').toLowerCase()
  const stationName = String(item.stationName || '').toLowerCase()
  if (stationName === normalized) return 100
  if (stationName.startsWith(normalized)) return 90
  if (displayName.startsWith(normalized)) return 80
  if (stationName.includes(normalized)) return 70
  if (displayName.includes(normalized)) return 60
  return 10
}

function requestRoutePlan(startId, endId) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: ROUTE_API_BASE,
      method: 'GET',
      data: {
        func: 'plantrip',
        startId,
        endId,
        planTime: '12:00',
        week: getCurrentWeekValue(),
        ticket: 'metro',
        type: 1,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.pathList) {
          resolve(res.data)
          return
        }
        reject(new Error('Invalid route response'))
      },
      fail(error) {
        reject(error)
      },
    })
  })
}

function getLegendItems() {
  return delay(legendItems)
}

function getRouteSearchSuggestions(keyword) {
  const items = routeSearchIndexJson.map(normalizeRouteSearchItem)
  if (!keyword) {
    return delay(items.slice(0, 8))
  }
  const normalized = keyword.trim()
  const results = items.filter((item) =>
    item.displayName.includes(normalized) ||
    item.stationName.includes(normalized) ||
    item.lineLabel.includes(normalized) ||
    (item.keywords || []).some((keywordItem) => keywordItem.includes(normalized))
  )
  results.sort((left, right) => {
    const diff = routeSearchScore(right, normalized) - routeSearchScore(left, normalized)
    if (diff !== 0) return diff
    return left.displayName.localeCompare(right.displayName, 'zh-Hans-CN')
  })
  return delay(results.slice(0, 20))
}

function getStationSearchSuggestions(keyword) {
  const items = stationSearchIndexJson.map(normalizeStationSearchItem)
  if (!keyword) {
    return delay(items.slice(0, 8))
  }
  const normalized = keyword.trim()
  const results = items.filter((item) =>
    item.displayName.includes(normalized) ||
    item.stationName.includes(normalized) ||
    (item.keywords || []).some((keywordItem) => keywordItem.includes(normalized))
  )
  results.sort((left, right) => {
    const diff = stationSearchScore(right, normalized) - stationSearchScore(left, normalized)
    if (diff !== 0) return diff
    return left.displayName.localeCompare(right.displayName, 'zh-Hans-CN')
  })
  return delay(results.slice(0, 20))
}

function getRouteCandidates() {
  return delay(routeMock.routeCandidates)
}

function getRouteToiletStations(routeId) {
  return delay(routeMock.routeToiletStations[routeId] || [])
}

async function planRoutes(startStationId, endStationId) {
  try {
    const response = await requestRoutePlan(startStationId, endStationId)
    const routeCandidates = (response.pathList || []).map((route, index) => {
      const stations = mapRouteStations(route)
      return {
        id: `route-${index + 1}`,
        summary: buildRouteSummary(
          route,
          index + 1,
          response.startStName,
          response.endStName,
          stations.length
        ),
        toiletStationCount: stations.length,
        routeToiletStations: stations,
        stationCount: Number(route.stationNum || 0),
        transferCount: Number(route.passLineCount || 0),
      }
    })

    return {
      source: 'remote',
      routeCandidates,
      errorMessage: '',
    }
  } catch (error) {
    return {
      source: 'mock',
      routeCandidates: routeMock.routeCandidates.map((item) => ({
        ...item,
        routeToiletStations: (routeMock.routeToiletStations[item.id] || []).map(normalizeRouteToiletStation),
      })),
      error,
      errorMessage: error && error.errMsg ? error.errMsg : '官方路线接口请求失败',
    }
  }
}

function getBrowseData() {
  return delay({
    all: (browseDataJson.all || []).map(normalizeBrowseStation),
    lines: (browseDataJson.lines || []).map((section) => ({
      lineNo: section.line_no || section.lineNo,
      lineLabel: section.line_label || section.lineLabel,
      lineStyle: lineColors.getLineChipStyle(section.line_no || section.lineNo, section.line_label || section.lineLabel),
      stations: (section.stations || []).map(normalizeBrowseStation),
    })),
  })
}

function getStationDetail(stationId) {
  const detail = stationDetailMap[stationId]
  if (!detail) {
    return delay(null)
  }
  return delay(normalizeStationDetail(detail))
}

function getRouteLineOptions() {
  const seen = new Map()
  routeSearchIndexJson.map(normalizeRouteSearchItem).forEach((item) => {
    if (!seen.has(item.lineNo)) {
      seen.set(item.lineNo, {
        lineNo: item.lineNo,
        lineLabel: item.lineLabel,
        lineStyle: lineColors.getLineChipStyle(item.lineNo, item.lineLabel),
      })
    }
  })
  return delay(Array.from(seen.values()))
}

function getRouteStationsByLine(lineNo) {
  const results = routeSearchIndexJson
    .map(normalizeRouteSearchItem)
    .filter((item) => item.lineNo === lineNo)
  return delay(results)
}

module.exports = {
  getLegendItems,
  getRouteSearchSuggestions,
  getStationSearchSuggestions,
  getRouteLineOptions,
  getRouteStationsByLine,
  getRouteCandidates,
  getRouteToiletStations,
  planRoutes,
  getBrowseData,
  getStationDetail,
}
