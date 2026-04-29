const shmetroService = require('../../services/shmetro')

const COMMENT_IMAGE_PATH = '/assets/comment-sample.jpg'

const STATION_DETAIL_MOCK = {
  '0115': {
    fromStartText: '距离起点11站（44分钟）',
    commentsCount: 1,
    draftPlaceholder: '说说你在上海南站找卫生间的经验...',
    toiletAvailability: {
      '1号线-0': '余位：3/5',
      '3号线-0': '余位：2/4',
      '15号线-0': '余位：3/5',
    },
    comments: [
      {
        id: 'comment-1',
        username: '老赵',
        content: '坐15号线，顾村公园方向的，从地铁中段下来往右走就可以看见厕所了！很干净，推荐！',
        time: '4月29日 14:22',
        likesText: '点赞 18',
        dislikeText: '不喜欢 2',
        replyText: '回复',
        imageSrc: COMMENT_IMAGE_PATH,
      },
    ],
  },
}

function enhanceStationDetail(stationDetail) {
  const mock = STATION_DETAIL_MOCK[stationDetail.stationId]
  if (!mock) {
    return {
      ...stationDetail,
      fromStartText: '',
      commentsCount: 0,
      draftPlaceholder: '分享你的站内经验...',
      comments: [],
    }
  }

  return {
    ...stationDetail,
    fromStartText: mock.fromStartText,
    commentsCount: mock.commentsCount,
    draftPlaceholder: mock.draftPlaceholder,
    comments: mock.comments,
    toiletLineGroups: (stationDetail.toiletLineGroups || []).map((group) => ({
      ...group,
      entries: (group.entries || []).map((entry, index) => ({
        ...entry,
        availabilityText: mock.toiletAvailability[`${group.lineLabel}-${index}`] || '余位：3/5',
      })),
    })),
  }
}

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
    const stationDetailRaw = await shmetroService.getStationDetail(stationId)
    const stationDetail = enhanceStationDetail(stationDetailRaw)
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
