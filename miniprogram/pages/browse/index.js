const shmetroService = require('../../services/shmetro')

const STATION_PROXIMITY_MAP = {
  '0115': { distanceKm: '0.8', etaMinutes: 6 },
  '0117': { distanceKm: '1.2', etaMinutes: 9 },
  '0729': { distanceKm: '2.4', etaMinutes: 14 },
  '1220': { distanceKm: '3.1', etaMinutes: 18 },
  '0928': { distanceKm: '4.6', etaMinutes: 24 },
  '1044': { distanceKm: '6.8', etaMinutes: 31 },
  '1066': { distanceKm: '8.2', etaMinutes: 35 },
}

function withProximity(item, index) {
  const fallback = {
    distanceKm: (1.5 + index * 0.7).toFixed(1),
    etaMinutes: 8 + index * 3,
  }
  const proximity = STATION_PROXIMITY_MAP[item.stationId] || fallback
  return {
    ...item,
    distanceText: `${proximity.distanceKm}km`,
    etaText: `${proximity.etaMinutes}分钟`,
    proximityOrder: Number(proximity.distanceKm),
  }
}

Page({
  data: {
    legends: [],
    browseData: { all: [], lines: [] },
    activeTab: 'all',
    activeLineNo: '',
    visibleStations: [],
    searchKeyword: '',
    searchResults: [],
    displayStations: [],
    emptyText: '当前分组下暂无可展示卫生间站点',
  },

  searchToken: 0,

  async onLoad() {
    const [legends, browseData] = await Promise.all([
      shmetroService.getLegendItems(),
      shmetroService.getBrowseData(),
    ])
    const enrichedAll = (browseData.all || [])
      .map(withProximity)
      .sort((left, right) => left.proximityOrder - right.proximityOrder)
    const enrichedLines = (browseData.lines || []).map((section) => ({
      ...section,
      stations: (section.stations || [])
        .map(withProximity)
        .sort((left, right) => left.proximityOrder - right.proximityOrder),
    }))
    this.setData({
      legends,
      browseData: {
        ...browseData,
        all: enrichedAll,
        lines: enrichedLines,
      },
      visibleStations: enrichedAll,
      displayStations: enrichedAll,
    })
  },

  syncDisplayStations(nextData = {}) {
    const searchKeyword = Object.prototype.hasOwnProperty.call(nextData, 'searchKeyword')
      ? nextData.searchKeyword
      : this.data.searchKeyword
    const searchResults = Object.prototype.hasOwnProperty.call(nextData, 'searchResults')
      ? nextData.searchResults
      : this.data.searchResults
    const visibleStations = Object.prototype.hasOwnProperty.call(nextData, 'visibleStations')
      ? nextData.visibleStations
      : this.data.visibleStations

    return {
      displayStations: searchKeyword ? searchResults : visibleStations,
      emptyText: searchKeyword ? '没有找到匹配站点' : '当前分组下暂无可展示卫生间站点',
    }
  },

  handleSelectAll() {
    const nextData = {
      activeTab: 'all',
      activeLineNo: '',
      visibleStations: this.data.browseData.all,
    }
    this.setData({
      ...nextData,
      ...this.syncDisplayStations(nextData),
    })
  },

  handleSelectLine(event) {
    const lineNo = event.currentTarget.dataset.lineNo
    const section = this.data.browseData.lines.find((item) => item.lineNo === lineNo)
    const nextData = {
      activeTab: 'line',
      activeLineNo: lineNo,
      visibleStations: section ? section.stations : [],
    }
    this.setData({
      ...nextData,
      ...this.syncDisplayStations(nextData),
    })
  },

  async handleSearchInput(event) {
    const searchKeyword = event && event.detail && typeof event.detail.value === 'string'
      ? event.detail.value
      : ''
    const token = Date.now()
    this.searchToken = token
    const searchResults = searchKeyword
      ? await shmetroService.getStationSearchSuggestions(searchKeyword)
      : []
    if (this.searchToken !== token) {
      return
    }
    const nextData = { searchKeyword, searchResults }
    this.setData({
      ...nextData,
      ...this.syncDisplayStations(nextData),
    })
  },

  handleClearSearch() {
    this.searchToken = Date.now()
    const nextData = { searchKeyword: '', searchResults: [] }
    this.setData({
      ...nextData,
      ...this.syncDisplayStations(nextData),
    })
  },

  handleOpenStation(event) {
    const { stationId, lineNo, index } = event.currentTarget.dataset
    const itemIndex = Number(index)
    const item = Number.isNaN(itemIndex) ? null : this.data.displayStations[itemIndex]
    const preferredLineNo = lineNo || (item ? item.preferredLineNo : '') || ''
    const query = preferredLineNo
      ? `stationId=${stationId}&lineNo=${preferredLineNo}`
      : `stationId=${stationId}`
    wx.navigateTo({
      url: `/pages/station-detail/index?${query}`,
    })
  },
})
