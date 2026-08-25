;(function () {
  var NS = (window.__DSHW = window.__DSHW || {})
  var send = NS.send
  var bus = NS.bus

  var port = null
  var latest = null

  function placeholder(mode) {
    return { requestedMode: mode || '', usageMode: mode || '', fellBack: false, sourceError: '', stale: false, loading: true, pages: [] }
  }

  function ensure() {
    if (port) return
    try {
      port = chrome.runtime.connect({ name: 'dshw-bubble' })
    } catch (err) {
      port = null
      return
    }
    port.onMessage.addListener(function (msg) {
      if (!msg || msg.type !== 'pages' || !msg.pageSet) return
      latest = msg.pageSet
      bus.emit('pages:update', { pageSet: latest, replace: false })
    })
    port.onDisconnect.addListener(function () {
      port = null
    })
  }

  function refresh() {
    ensure()
    send('getBubblePages').then(function (ps) {
      if (!ps || !ps.pages) return
      latest = ps
      bus.emit('pages:update', { pageSet: ps, replace: true })
    })
  }

  function getLatest() {
    return latest
  }

  NS.data = {
    ensure: ensure,
    refresh: refresh,
    getLatest: getLatest,
    placeholder: placeholder,
  }
})()
