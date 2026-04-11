const data = require('../data/shmetro-data')
const routeMock = require('../mock/route')

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

function delay(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(clone(data)), 40)
  })
}

function normalizeRouteSearchItem(item) {
  return {
    stationId: item.station_id || item.stationId,
    stationEntityId: item.station_entity_id || item.stationEntityId,
    stationName: item.station_name || item.stationName,
    lineNo: item.line_no || item.lineNo,
    lineLabel: item.line_label || item.lineLabel,
    displayName: item.display_name || item.displayName,
    keywords: item.keywords || [],
  }
}

function normalizeStationSearchItem(item) {
  return {
    stationId: item.station_id || item.stationId,
    stationName: item.station_name || item.stationName,
    lineLabels: item.line_labels || item.lineLabels || [],
    displayName: item.display_name || item.displayName,
    keywords: item.keywords || [],
    legendTypes: item.legend_types || item.legendTypes || [],
  }
}

function normalizeBrowseStation(item) {
  return {
    stationId: item.station_id || item.stationId,
    stationName: item.station_name || item.stationName,
    lineLabel: item.line_label || item.lineLabel || '',
    stationLineLabels: item.station_line_labels || item.stationLineLabels || [],
    legendTypes: item.legend_types || item.legendTypes || [],
    scopeTypes: item.scope_types || item.scopeTypes || [],
    hasFloorplan: item.has_floorplan || item.hasFloorplan || false,
  }
}

function normalizeStationDetail(detail) {
  return {
    ...detail,
    stationId: detail.station_id || detail.stationId,
    stationName: detail.station_name || detail.stationName,
    floorplanUrl: detail.floorplan_url || detail.floorplanUrl || '',
    floorplanLocalPath: detail.floorplan_local_path || detail.floorplanLocalPath || '',
    lineLabels: detail.line_labels || detail.lineLabels || [],
    toiletLineGroups: (detail.toilet_line_groups || detail.toiletLineGroups || []).map((group) => ({
      lineNo: group.line_no || group.lineNo,
      lineLabel: group.line_label || group.lineLabel,
      entries: (group.entries || []).map((entry) => ({
        scopeType: entry.scope_type || entry.scopeType,
        description: entry.description,
        legendTypes: entry.legend_types || entry.legendTypes || [],
        hasAccessibleToilet: entry.has_accessible_toilet || entry.hasAccessibleToilet || false,
        accessibleAbsent: entry.accessible_absent || entry.accessibleAbsent || false,
        icon1: entry.icon1 || '',
        icon2: entry.icon2 || '',
      })),
    })),
  }
}

function getLegendItems() {
  return delay(data.legendItems)
}

function getRouteSearchSuggestions(keyword) {
  const items = data.routeSearchIndex.map(normalizeRouteSearchItem)
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
  return delay(results.slice(0, 12))
}

function getStationSearchSuggestions(keyword) {
  const items = data.stationSearchIndex.map(normalizeStationSearchItem)
  if (!keyword) {
    return delay(items.slice(0, 8))
  }
  const normalized = keyword.trim()
  const results = items.filter((item) =>
    item.displayName.includes(normalized) ||
    item.stationName.includes(normalized) ||
    (item.keywords || []).some((keywordItem) => keywordItem.includes(normalized))
  )
  return delay(results.slice(0, 12))
}

function getRouteCandidates() {
  return delay(routeMock.routeCandidates)
}

function getRouteToiletStations(routeId) {
  return delay(routeMock.routeToiletStations[routeId] || [])
}

function getBrowseData() {
  return delay({
    all: (data.browseData.all || []).map(normalizeBrowseStation),
    lines: (data.browseData.lines || []).map((section) => ({
      lineNo: section.line_no || section.lineNo,
      lineLabel: section.line_label || section.lineLabel,
      stations: (section.stations || []).map(normalizeBrowseStation),
    })),
  })
}

function getStationDetail(stationId) {
  const detail = data.stationDetailMap[stationId]
  if (!detail) {
    return delay(null)
  }
  return delay(normalizeStationDetail(detail))
}

function getRouteLineOptions() {
  const seen = new Map()
  data.routeSearchIndex.map(normalizeRouteSearchItem).forEach((item) => {
    if (!seen.has(item.lineNo)) {
      seen.set(item.lineNo, {
        lineNo: item.lineNo,
        lineLabel: item.lineLabel,
      })
    }
  })
  return delay(Array.from(seen.values()))
}

function getRouteStationsByLine(lineNo) {
  const results = data.routeSearchIndex
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
  getBrowseData,
  getStationDetail,
}
