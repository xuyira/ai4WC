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
    })
  },

  handleSelectAll() {
    this.setData({
      activeTab: 'all',
      activeLineNo: '',
      visibleStations: this.data.browseData.all,
    })
  },

  handleSelectLine(event) {
    const lineNo = event.currentTarget.dataset.lineNo
    const section = this.data.browseData.lines.find((item) => item.lineNo === lineNo)
    this.setData({
      activeTab: 'line',
      activeLineNo: lineNo,
      visibleStations: section ? section.stations : [],
    })
  },

  async handleSearchInput(event) {
    const searchKeyword = event.detail.value
    const searchResults = searchKeyword
      ? await shmetroService.getStationSearchSuggestions(searchKeyword)
      : []
    this.setData({ searchKeyword, searchResults })
  },

  handleClearSearch() {
    this.setData({ searchKeyword: '', searchResults: [] })
  },

  handleOpenStation(event) {
    const { stationId } = event.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/station-detail/index?stationId=${stationId}`,
    })
  },
})
