;(function () {
  function $(id) { return document.getElementById(id) }
  function send(type, payload) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage(Object.assign({ type: type }, payload || {}), function (r) {
        if (chrome.runtime.lastError) return resolve(null)
        resolve(r)
      })
    })
  }

  var state = {
    origin: null,
    cfg: null,
    bal: null,
    meta: null,
  }

  $('ver').textContent = 'v' + chrome.runtime.getManifest().version

  async function currentOrigin() {
    try {
      var tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      var tab = tabs && tabs[0]
      if (!tab || !tab.url) return null
      var u = new URL(tab.url)
      if (u.protocol === 'http:' || u.protocol === 'https:') return u.origin
      return null
    } catch (err) { return null }
  }

  function providerLabel(id) {
    if (state.meta && state.meta[id]) return state.meta[id].label
    return id || '—'
  }

  function render() {
    var bal = state.bal
    var opencodeMode = !!(bal && bal.requestedMode === 'opencode')
    var balanceEl = $('balance')
    if (opencodeMode) {
      balanceEl.textContent = '—'
      balanceEl.classList.add('disabled')
      var pages = bal.pages || []
      $('usage').textContent = pages[0] ? pages[0].main : '--'
      $('source').textContent = 'Opencode'
      if (bal.usageError) {
        $('status').textContent = '不可用：' + bal.usageError.slice(0, 60)
        $('status').classList.add('err')
      } else {
        $('status').textContent = 'Opencode 用量模式'
        $('status').classList.remove('err')
      }
      return
    }
    balanceEl.classList.remove('disabled')
    $('balance').textContent = bal && bal.ok
      ? (bal.currency === 'CNY' ? '¥ ' : bal.currency + ' ') + (isFinite(bal.totalBalance) ? Number(bal.totalBalance).toFixed(2) : '--')
      : '--'
    if (bal && bal.ok) {
      var pages = bal.pages || []
      var p = pages[Math.min(0, pages.length - 1)]
      $('usage').textContent = p ? p.main : (bal.todayUsage !== null && bal.todayUsage !== undefined ? '¥ ' + Number(bal.todayUsage).toFixed(2) : '--')
      $('source').textContent = providerLabel(bal.usageMode)
      if (bal.usageError) {
        $('status').textContent = '不可用：' + bal.usageError.slice(0, 60)
        $('status').classList.add('err')
      } else {
        $('status').textContent = bal.stale ? '使用最近余额（网络抖动）' : '正常'
        $('status').classList.remove('err')
      }
    } else {
      var pages = (bal && bal.pages) || []
      if (pages.length > 0) {
        $('usage').textContent = pages[0].main
        $('source').textContent = providerLabel(bal.usageMode)
        if (bal.usageError) {
          $('status').textContent = '不可用：' + bal.usageError.slice(0, 60)
        } else {
          $('status').textContent = (bal && bal.error) ? '余额不可用：' + bal.error.slice(0, 40) : '余额不可用'
        }
        $('status').classList.add('err')
      } else {
        $('usage').textContent = '--'
        $('source').textContent = '—'
        $('status').textContent = (bal && bal.error) ? bal.error : '加载失败'
        $('status').classList.add('err')
      }
    }
  }

  async function load() {
    var [bal, cfg, meta] = await Promise.all([send('getBalance'), send('getConfig'), send('getProviders')])
    state.bal = bal
    state.cfg = cfg
    state.meta = meta
    render()
    renderSiteArea()
  }

  function isHiddenSite(cfg, origin) {
    return !!(cfg && (cfg.hiddenSites || []).indexOf(origin) !== -1)
  }

  async function renderSiteArea() {
    var origin = state.origin
    var area = $('siteArea')
    if (!origin) {
      area.style.display = 'none'
      $('siteHint').textContent = '当前页面不是普通网页（http/https），无法在此隐藏。'
      return
    }
    area.style.display = ''
    $('btnHideSite').textContent = isHiddenSite(state.cfg, origin) ? '取消隐藏本站' : '隐藏本站'
    $('btnPause').textContent = state.cfg && state.cfg.paused ? '恢复显示' : '全局暂停'
    $('siteHint').textContent = isHiddenSite(state.cfg, origin)
      ? '本站已在隐藏名单，刷新后不再显示小鲸鱼。'
      : '挂件已随所有网页自动注入，无需授权。隐藏/暂停即时生效。'
  }

  $('btnHideSite').addEventListener('click', async function () {
    if (!state.origin) return
    var list = (state.cfg && state.cfg.hiddenSites) || []
    var idx = list.indexOf(state.origin)
    var next = idx >= 0 ? list.filter(function (s) { return s !== state.origin }) : list.concat([state.origin])
    var cfg = await send('setConfig', { patch: { hiddenSites: next } })
    if (cfg) state.cfg = cfg
    renderSiteArea()
  })

  $('btnPause').addEventListener('click', async function () {
    var next = !(state.cfg && state.cfg.paused)
    var cfg = await send('setConfig', { patch: { paused: next } })
    if (cfg) state.cfg = cfg
    renderSiteArea()
  })

  $('btnRefresh').addEventListener('click', function () {
    $('balance').textContent = '…'
    load()
  })

  $('btnOptions').addEventListener('click', function () {
    chrome.runtime.openOptionsPage()
  })

  currentOrigin().then(function (o) {
    state.origin = o
    return load()
  })
})()
