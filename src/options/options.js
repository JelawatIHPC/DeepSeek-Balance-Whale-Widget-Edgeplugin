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

  var cfg = {}

  function normSite(s) {
    var t = String(s || '').trim().replace(/\/+$/, '')
    if (!t) return null
    if (!/^https?:\/\//i.test(t)) t = 'https://' + t
    try {
      var u = new URL(t)
      return u.origin
    } catch (err) { return null }
  }

  function renderSites() {
    var list = cfg.hiddenSites || []
    var box = $('siteList')
    box.innerHTML = ''
    if (list.length === 0) {
      var empty = document.createElement('div')
      empty.className = 'site-row'
      empty.textContent = '（无）'
      box.appendChild(empty)
      return
    }
    list.forEach(function (site) {
      var row = document.createElement('div')
      row.className = 'site-row'
      var span = document.createElement('span')
      span.textContent = site
      var btn = document.createElement('button')
      btn.textContent = '移除'
      btn.addEventListener('click', async function () {
        var next = (cfg.hiddenSites || []).filter(function (s) { return s !== site })
        cfg = await send('setConfig', { patch: { hiddenSites: next } }) || cfg
        renderSites()
      })
      row.appendChild(span)
      row.appendChild(btn)
      box.appendChild(row)
    })
  }

  async function load() {
    var bag = await chrome.storage.local.get(['config', 'credentials'])
    cfg = bag.config || {}
    var creds = bag.credentials || {}
    $('apiKey').value = creds.apiKey || ''
    $('platformToken').value = creds.platformToken || ''
    $('paused').checked = !!cfg.paused
    renderSites()
  }

  $('btnSave').addEventListener('click', async function () {
    var msg = $('saveMsg')
    msg.className = 'msg'
    msg.textContent = '保存中…'
    var apiKey = $('apiKey').value.trim()
    var platformToken = $('platformToken').value.trim()
    await chrome.storage.local.set({ credentials: { apiKey: apiKey, platformToken: platformToken } })
    var bal = await send('getBalance')
    if (bal && bal.ok) {
      msg.className = 'msg ok'
      msg.textContent = '已保存并通过校验：余额 ' + (bal.currency === 'CNY' ? '¥ ' : bal.currency + ' ') + Number(bal.totalBalance).toFixed(2)
    } else if (bal && bal.code === 'NO_KEY') {
      msg.className = 'msg err'
      msg.textContent = '已保存，但未填写 API Key（填了 Key 才能拉取余额）'
    } else {
      msg.className = 'msg err'
      msg.textContent = '已保存，但校验失败：' + ((bal && bal.error) || '未知错误') + '（Key 错误或网络问题）'
    }
  })

  $('paused').addEventListener('change', async function () {
    cfg = await send('setConfig', { patch: { paused: $('paused').checked } }) || cfg
  })

  $('btnAddSite').addEventListener('click', async function () {
    var site = normSite($('siteInput').value)
    if (!site) { $('siteInput').value = ''; return }
    var next = (cfg.hiddenSites || []).slice()
    if (next.indexOf(site) === -1) next.push(site)
    cfg = await send('setConfig', { patch: { hiddenSites: next } }) || cfg
    $('siteInput').value = ''
    renderSites()
  })

  $('btnClearSites').addEventListener('click', async function () {
    cfg = await send('setConfig', { patch: { hiddenSites: [] } }) || cfg
    renderSites()
  })

  $('btnReset').addEventListener('click', async function () {
    cfg = await send('setConfig', {
      patch: {
        scale: 1, sound: true, vol: 0.9, soundSet: 'duck', usageMode: 'deepseek', ledgerMode: 'ledger',
        peakMode: 'default', bubbleOn: true, scrollGapOn: false, scrollGapPx: 17,
        hiddenSites: ['http://127.0.0.1:3080', 'http://localhost:3080'],
        paused: false,
      }
    }) || cfg
    $('paused').checked = false
    renderSites()
  })

  load()
})()
