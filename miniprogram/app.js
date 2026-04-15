const APP_NAME = '上海地铁卫生间指南'
const originalPage = Page

function buildQuery(options = {}) {
  return Object.keys(options)
    .filter((key) => options[key] !== undefined && options[key] !== null && options[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(options[key])}`)
    .join('&')
}

function buildSharePath(page) {
  if (!page || !page.route) {
    return '/pages/route/index'
  }

  const query = buildQuery(page.__shareOptions || {})
  return query ? `/${page.route}?${query}` : `/${page.route}`
}

function buildShareTitle(page) {
  const stationName = page &&
    page.data &&
    page.data.stationDetail &&
    page.data.stationDetail.stationName

  return stationName ? `${stationName}站卫生间指南` : APP_NAME
}

function enableShareMenu() {
  if (typeof wx === 'undefined' || typeof wx.showShareMenu !== 'function') {
    return
  }

  wx.showShareMenu({
    menus: ['shareAppMessage', 'shareTimeline'],
  })
}

Page = function createPage(pageConfig = {}) {
  const userOnLoad = pageConfig.onLoad
  const nextPageConfig = {
    ...pageConfig,

    onLoad(options = {}) {
      this.__shareOptions = options

      if (typeof userOnLoad === 'function') {
        return userOnLoad.call(this, options)
      }

      return undefined
    },
  }

  if (typeof pageConfig.onShareAppMessage !== 'function') {
    nextPageConfig.onShareAppMessage = function onShareAppMessage() {
      return {
        title: buildShareTitle(this),
        path: buildSharePath(this),
      }
    }
  }

  if (typeof pageConfig.onShareTimeline !== 'function') {
    nextPageConfig.onShareTimeline = function onShareTimeline() {
      return {
        title: buildShareTitle(this),
        query: buildQuery(this.__shareOptions || {}),
      }
    }
  }

  return originalPage(nextPageConfig)
}

App({
  onLaunch() {
    enableShareMenu()

    if (typeof wx !== 'undefined' && typeof wx.onAppRoute === 'function') {
      wx.onAppRoute(enableShareMenu)
    }
  },

  globalData: {
    appName: APP_NAME,
  },
})
