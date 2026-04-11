const shmetroService = require('../../services/shmetro')

Page({
  data: {
    stationDetail: null,
    isLoading: true,
    activeFloorplanLineNo: '',
    floorplanTabs: [],
    visibleFloorplanGroups: [],
  },

  async onLoad(options) {
    const stationId = options.stationId || '1521'
    const stationDetail = await shmetroService.getStationDetail(stationId)
    const activeFloorplanLineNo = this.resolveInitialLineNo(
      options.lineNo || '',
      stationDetail
    )
    this.setData({
      stationDetail,
      isLoading: false,
      activeFloorplanLineNo,
      floorplanTabs: this.getFloorplanTabs(stationDetail, activeFloorplanLineNo),
      visibleFloorplanGroups: this.getVisibleFloorplanGroups(stationDetail, activeFloorplanLineNo),
    })
  },

  resolveInitialLineNo(preferredLineNo, stationDetail) {
    const groups = stationDetail && stationDetail.floorplanGroups ? stationDetail.floorplanGroups : []
    if (!groups.length) {
      return ''
    }
    if (preferredLineNo && groups.some((group) => (group.lineNos || []).includes(preferredLineNo))) {
      return preferredLineNo
    }
    return groups[0].lineNos && groups[0].lineNos[0] ? groups[0].lineNos[0] : ''
  },

  getVisibleFloorplanGroups(stationDetail, activeFloorplanLineNo) {
    const groups = stationDetail && stationDetail.floorplanGroups ? stationDetail.floorplanGroups : []
    if (!groups.length) {
      return []
    }
    if (!activeFloorplanLineNo) {
      return groups
    }
    return groups.filter((group) => (group.lineNos || []).includes(activeFloorplanLineNo))
  },

  getFloorplanTabs(stationDetail, activeFloorplanLineNo) {
    const groups = stationDetail && stationDetail.floorplanGroups ? stationDetail.floorplanGroups : []
    return groups.map((group) => ({
      lineNo: group.lineNos && group.lineNos[0] ? group.lineNos[0] : '',
      lineLabelText: group.lineLabelText || '',
      lineStyle: group.lineChips && group.lineChips[0] ? group.lineChips[0].style : '',
      active: !!(activeFloorplanLineNo && group.lineNos && group.lineNos.includes(activeFloorplanLineNo)),
    }))
  },

  handleSwitchFloorplanLine(event) {
    const activeFloorplanLineNo = event.currentTarget.dataset.lineNo || ''
    this.setData({
      activeFloorplanLineNo,
      floorplanTabs: this.getFloorplanTabs(this.data.stationDetail, activeFloorplanLineNo),
      visibleFloorplanGroups: this.getVisibleFloorplanGroups(this.data.stationDetail, activeFloorplanLineNo),
    })
  },
})
