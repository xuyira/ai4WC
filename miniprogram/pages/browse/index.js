const shmetroService = require('../../services/shmetro')

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

  async onLoad() {
    const [legends, browseData] = await Promise.all([
      shmetroService.getLegendItems(),
      shmetroService.getBrowseData(),
    ])
    this.setData({
      legends,
      browseData,
      visibleStations: browseData.all,
      displayStations: browseData.all,
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
    const searchKeyword = event.detail.value
    const searchResults = searchKeyword
      ? await shmetroService.getStationSearchSuggestions(searchKeyword)
      : []
    const nextData = { searchKeyword, searchResults }
    this.setData({
      ...nextData,
      ...this.syncDisplayStations(nextData),
    })
  },

  handleClearSearch() {
    const nextData = { searchKeyword: '', searchResults: [] }
    this.setData({
      ...nextData,
      ...this.syncDisplayStations(nextData),
    })
  },

  handleOpenStation(event) {
    const { stationId } = event.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/station-detail/index?stationId=${stationId}`,
    })
  },
})
