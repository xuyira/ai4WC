const shmetroService = require('../../services/shmetro')

Page({
  data: {
    stationDetail: null,
    isLoading: true,
  },

  async onLoad(options) {
    const stationId = options.stationId || '1521'
    const stationDetail = await shmetroService.getStationDetail(stationId)
    this.setData({ stationDetail, isLoading: false })
  },
})
