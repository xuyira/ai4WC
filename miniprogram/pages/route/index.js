const shmetroService = require('../../services/shmetro')

Page({
  data: {
    legends: [],
    startStation: null,
    endStation: null,
    routeCandidates: [],
    activeRouteId: '',
    routeToiletStations: [],
    pickerVisible: false,
    pickerTarget: 'start',
    pickerMode: 'search',
    pickerKeyword: '',
    pickerSuggestions: [],
    pickerLines: [],
    pickerActiveLineNo: '',
    pickerLineStations: [],
  },

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
    const pickerSuggestions = await shmetroService.getRouteSearchSuggestions('')
    this.setData({
      pickerVisible: true,
      pickerTarget: target,
      pickerMode: 'search',
      pickerKeyword: '',
      pickerSuggestions,
    })
  },

  closePicker() {
    this.setData({ pickerVisible: false })
  },

  async handlePickerKeywordInput(event) {
    const pickerKeyword = event.detail.value
    const pickerSuggestions = await shmetroService.getRouteSearchSuggestions(pickerKeyword)
    this.setData({ pickerKeyword, pickerSuggestions })
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
    const field = this.data.pickerTarget === 'start' ? 'startStation' : 'endStation'
    this.setData({
      [field]: station,
      pickerVisible: false,
    })
  },

  noop() {},

  async handleSearch() {
    if (!this.data.startStation || !this.data.endStation) {
      wx.showToast({ title: '请先选择起点和终点', icon: 'none' })
      return
    }
    const routeCandidates = await shmetroService.getRouteCandidates()
    const activeRouteId = routeCandidates[0] ? routeCandidates[0].id : ''
    const routeToiletStations = activeRouteId
      ? await shmetroService.getRouteToiletStations(activeRouteId)
      : []
    this.setData({
      routeCandidates,
      activeRouteId,
      routeToiletStations,
    })
  },

  async handleSelectRoute(event) {
    const routeId = event.currentTarget.dataset.routeId
    const routeToiletStations = await shmetroService.getRouteToiletStations(routeId)
    this.setData({
      activeRouteId: routeId,
      routeToiletStations,
    })
  },

  handleOpenStation(event) {
    const { stationId } = event.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/station-detail/index?stationId=${stationId}`,
    })
  },
})
