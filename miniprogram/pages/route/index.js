const shmetroService = require('../../services/shmetro')

Page({
  data: {
    legends: [],
    startStation: null,
    endStation: null,
    routeCandidates: [],
    activeRouteId: '',
    allRouteToiletStations: [],
    routeToiletStations: [],
    routeStationFilterOptions: [
      { label: '所有', value: 'all' },
      { label: '只看费区内', value: 'inside' },
      { label: '只看费区外', value: 'outside' },
      { label: '只看费区内外均有', value: 'inside_outside' },
      { label: '只看无障碍卫生间', value: 'accessible' },
    ],
    routeStationFilterIndex: 0,
    routeStationFilterValue: 'all',
    isLoadingRoutes: false,
    routeError: '',
    routeSource: '',
    pickerVisible: false,
    pickerTarget: 'start',
    pickerMode: 'search',
    pickerKeyword: '',
    pickerSuggestions: [],
    pickerLines: [],
    pickerActiveLineNo: '',
    pickerLineStations: [],
  },

  pickerSearchToken: 0,

  async onLoad() {
    const [legends, pickerLines] = await Promise.all([
      shmetroService.getLegendItems(),
      shmetroService.getRouteLineOptions(),
    ])
    const pickerActiveLineNo = pickerLines[0] ? pickerLines[0].lineNo : ''
    const pickerLineStations = pickerActiveLineNo
      ? await shmetroService.getRouteStationsByLine(pickerActiveLineNo)
      : []
    this.setData({ legends, pickerLines, pickerActiveLineNo, pickerLineStations })
  },

  async openPicker(event) {
    const target = event.currentTarget.dataset.target
    this.setData({
      pickerVisible: true,
      pickerTarget: target,
      pickerMode: 'search',
      pickerKeyword: '',
      pickerSuggestions: [],
    })
  },

  closePicker() {
    this.setData({ pickerVisible: false, pickerKeyword: '', pickerSuggestions: [] })
  },

  async handlePickerKeywordInput(event) {
    const pickerKeyword = event && event.detail && typeof event.detail.value === 'string'
      ? event.detail.value
      : ''
    const token = Date.now()
    this.pickerSearchToken = token
    const pickerSuggestions = await shmetroService.getRouteSearchSuggestions(pickerKeyword)
    if (this.pickerSearchToken !== token) {
      return
    }
    this.setData({ pickerKeyword, pickerSuggestions })
  },

  async handleClearPickerKeyword() {
    this.pickerSearchToken = Date.now()
    this.setData({
      pickerKeyword: '',
      pickerSuggestions: [],
    })
  },

  handleSwitchPickerMode(event) {
    this.setData({ pickerMode: event.currentTarget.dataset.mode })
  },

  async handleSelectPickerLine(event) {
    const pickerActiveLineNo = event.currentTarget.dataset.lineNo
    const pickerLineStations = await shmetroService.getRouteStationsByLine(pickerActiveLineNo)
    this.setData({ pickerActiveLineNo, pickerLineStations })
  },

  handleChooseRouteStation(event) {
    const index = event.currentTarget.dataset.index
    const source = event.currentTarget.dataset.source
    const station = source === 'line'
      ? this.data.pickerLineStations[index]
      : this.data.pickerSuggestions[index]
    if (!station) {
      return
    }
    const field = this.data.pickerTarget === 'start' ? 'startStation' : 'endStation'
    this.setData({
      [field]: station,
      pickerVisible: false,
    })
  },

  noop() {},

  getFilteredRouteStations(stations, filterValue) {
    if (!filterValue || filterValue === 'all') {
      return stations
    }
    return stations.filter((station) => {
      const legendTypes = station.legendTypes || []
      const scopeTypes = station.scopeTypes || []
      if (filterValue === 'inside') {
        return scopeTypes.includes('inside')
      }
      if (filterValue === 'outside') {
        return scopeTypes.includes('outside')
      }
      if (filterValue === 'inside_outside') {
        return scopeTypes.includes('inside_outside') || (scopeTypes.includes('inside') && scopeTypes.includes('outside'))
      }
      if (filterValue === 'accessible') {
        return legendTypes.some((type) => type.indexOf('accessible') !== -1)
      }
      return true
    })
  },

  applyRouteStationFilter(nextState = {}) {
    const allRouteToiletStations = Object.prototype.hasOwnProperty.call(nextState, 'allRouteToiletStations')
      ? nextState.allRouteToiletStations
      : this.data.allRouteToiletStations
    const routeStationFilterValue = Object.prototype.hasOwnProperty.call(nextState, 'routeStationFilterValue')
      ? nextState.routeStationFilterValue
      : this.data.routeStationFilterValue
    return this.getFilteredRouteStations(allRouteToiletStations, routeStationFilterValue)
  },

  async handleSearch() {
    if (!this.data.startStation || !this.data.endStation) {
      wx.showToast({ title: '请先选择起点和终点', icon: 'none' })
      return
    }
    if (this.data.startStation.stationId === this.data.endStation.stationId) {
      wx.showToast({ title: '起点和终点不能相同', icon: 'none' })
      return
    }
    this.setData({
      isLoadingRoutes: true,
      routeError: '',
      routeCandidates: [],
      activeRouteId: '',
      allRouteToiletStations: [],
      routeToiletStations: [],
      routeStationFilterIndex: 0,
      routeStationFilterValue: 'all',
    })
    const { routeCandidates, source, errorMessage } = await shmetroService.planRoutes(
      this.data.startStation.stationId,
      this.data.endStation.stationId
    )
    const activeRouteId = routeCandidates[0] ? routeCandidates[0].id : ''
    const activeRoute = routeCandidates.find((item) => item.id === activeRouteId)
    const allRouteToiletStations = activeRoute ? (activeRoute.routeToiletStations || []) : []
    this.setData({
      isLoadingRoutes: false,
      routeCandidates,
      activeRouteId,
      allRouteToiletStations,
      routeToiletStations: this.getFilteredRouteStations(allRouteToiletStations, 'all'),
      routeSource: source,
      routeError: source === 'mock' ? errorMessage : (routeCandidates.length ? '' : '未找到可行路线'),
    })
    if (source === 'mock' && routeCandidates.length) {
      wx.showToast({ title: '官方路线接口不可用，已回退示例数据', icon: 'none' })
    }
  },

  handleSelectRoute(event) {
    const routeId = event.currentTarget.dataset.routeId
    const route = this.data.routeCandidates.find((item) => item.id === routeId)
    const allRouteToiletStations = route ? (route.routeToiletStations || []) : []
    this.setData({
      activeRouteId: routeId,
      allRouteToiletStations,
      routeToiletStations: this.applyRouteStationFilter({ allRouteToiletStations }),
    })
  },

  handleRouteStationFilterChange(event) {
    const routeStationFilterIndex = Number(event.detail.value || 0)
    const option = this.data.routeStationFilterOptions[routeStationFilterIndex] || this.data.routeStationFilterOptions[0]
    const routeStationFilterValue = option.value
    this.setData({
      routeStationFilterIndex,
      routeStationFilterValue,
      routeToiletStations: this.applyRouteStationFilter({ routeStationFilterValue }),
    })
  },

  handleOpenStation(event) {
    const { stationId, lineNo } = event.currentTarget.dataset
    const query = lineNo
      ? `stationId=${stationId}&lineNo=${lineNo}`
      : `stationId=${stationId}`
    wx.navigateTo({
      url: `/pages/station-detail/index?${query}`,
    })
  },
})
