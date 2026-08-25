;(function () {
  var NS = (window.__DSHW = window.__DSHW || {})
  if (window.__dshWhaleWidget) return
  window.__dshWhaleWidget = true

  var consts = NS.consts
  var clamp = NS.util.clamp
  var viewport = NS.util.viewport
  var send = NS.send
  var MIN_SCALE = consts.MIN_SCALE
  var MAX_SCALE = consts.MAX_SCALE

  var root = document.createElement('div')
  root.className = 'dshwv-root'

  var body = document.createElement('div')
  body.className = 'dshwv-body'

  var img = document.createElement('img')
  img.className = 'dshwv-img'
  img.src = chrome.runtime.getURL('assets/DSniang1.png')
  img.alt = 'DeepSeek 余额'
  img.draggable = false

  var menuBtn = document.createElement('button')
  menuBtn.type = 'button'
  menuBtn.className = 'dshwv-menu-btn'
  menuBtn.title = '菜单'
  menuBtn.innerHTML = '<span></span><span></span><span></span>'
  menuBtn.addEventListener('click', function (e) { e.stopPropagation(); NS.interact.toggleMenu() })

  var menuBox = document.createElement('div')
  menuBox.className = 'dshwv-menu'
  function menuLabel(text) {
    var s = document.createElement('span')
    s.textContent = text
    return s
  }
  function menuRow() {
    var r = document.createElement('div')
    r.className = 'dshwv-menu-row'
    return r
  }
  function soundOpt(value, label) {
    var o = document.createElement('option')
    o.value = value
    o.textContent = label
    return o
  }

  var scaleInput = document.createElement('input')
  scaleInput.type = 'range'
  scaleInput.min = String(MIN_SCALE)
  scaleInput.max = String(MAX_SCALE)
  scaleInput.step = '0.1'
  scaleInput.className = 'dshwv-range'
  scaleInput.value = '1.5'
  var scaleNumber = document.createElement('input')
  scaleNumber.type = 'number'
  scaleNumber.min = '1'
  scaleNumber.max = '20'
  scaleNumber.step = '1'
  scaleNumber.className = 'dshwv-number'
  scaleNumber.value = '10'
  scaleInput.addEventListener('pointerdown', function () { root.style.transition = 'none' })
  scaleInput.addEventListener('input', function () { setScale(scaleInput.value) })
  scaleInput.addEventListener('change', function () { root.style.transition = '' })
  function scaleFromNumber(v) {
    v = Math.round(Number(v))
    return MIN_SCALE + (Math.max(0, Math.min(20, v)) - 1) * (MAX_SCALE - MIN_SCALE) / 19
  }
  scaleNumber.addEventListener('focus', function () { root.style.transition = 'none' })
  scaleNumber.addEventListener('blur', function () { root.style.transition = '' })
  scaleNumber.addEventListener('input', function () { setScale(scaleFromNumber(scaleNumber.value)) })
  scaleNumber.addEventListener('change', function () {
    setScale(scaleFromNumber(scaleNumber.value))
    root.style.transition = ''
  })

  var soundSelect = document.createElement('select')
  soundSelect.className = 'dshwv-sound'
  soundSelect.appendChild(soundOpt('duck', '小黄鸭'))
  soundSelect.appendChild(soundOpt('fx1', '音效1'))
  soundSelect.addEventListener('change', function () { setSoundSet(soundSelect.value) })

  var usageSelect = document.createElement('select')
  usageSelect.className = 'dshwv-sound'
  usageSelect.addEventListener('change', function () { setUsageMode(usageSelect.value) })

  var ledgerSelect = document.createElement('select')
  ledgerSelect.className = 'dshwv-sound'
  ledgerSelect.appendChild(soundOpt('ledger', '小鲸鱼记账'))
  ledgerSelect.appendChild(soundOpt('dsToken', '实时·令牌'))
  ledgerSelect.title = 'Deepseek 模式的今日已用记账方式'
  ledgerSelect.addEventListener('change', function () { setLedgerMode(ledgerSelect.value) })

  var peakSelect = document.createElement('select')
  peakSelect.className = 'dshwv-sound'
  peakSelect.appendChild(soundOpt('default', '默认'))
  peakSelect.appendChild(soundOpt('liangwen', '梁文峰谷'))
  peakSelect.appendChild(soundOpt('qiangqiang', '!?强强?!'))
  peakSelect.addEventListener('change', function () { setPeakMode(peakSelect.value) })

  var bubbleToggle = document.createElement('input')
  bubbleToggle.type = 'checkbox'
  bubbleToggle.className = 'dshwv-check'
  bubbleToggle.checked = true
  bubbleToggle.title = '开启/关闭思考气泡'
  bubbleToggle.addEventListener('change', function () { setBubbleOn(bubbleToggle.checked) })

  var scrollGapToggle = document.createElement('input')
  scrollGapToggle.type = 'checkbox'
  scrollGapToggle.className = 'dshwv-check'
  scrollGapToggle.checked = false
  scrollGapToggle.title = '开启后挂件右侧按设定像素避开滚动条；关闭则贴边（盖住滚动条）'
  scrollGapToggle.addEventListener('change', function () { setScrollGapOn(scrollGapToggle.checked) })

  var scrollGapInput = document.createElement('input')
  scrollGapInput.type = 'number'
  scrollGapInput.min = '0'
  scrollGapInput.step = '1'
  scrollGapInput.className = 'dshwv-number'
  scrollGapInput.value = '17'
  scrollGapInput.disabled = true
  scrollGapInput.title = '避让滚动条的像素宽度，填 0 表示贴边'
  scrollGapInput.addEventListener('input', function () { setScrollGapPx(scrollGapInput.value) })
  scrollGapInput.addEventListener('change', function () { setScrollGapPx(scrollGapInput.value) })

  var row1 = menuRow()
  row1.appendChild(menuLabel('大小'))
  row1.appendChild(scaleInput)
  row1.appendChild(scaleNumber)
  var row2 = menuRow()
  row2.appendChild(menuLabel('音效'))
  row2.appendChild(soundSelect)
  var volInput = document.createElement('input')
  volInput.type = 'range'
  volInput.min = '0'
  volInput.max = '1'
  volInput.step = '0.05'
  volInput.className = 'dshwv-range'
  volInput.value = '0.9'
  var volPct = document.createElement('span')
  volPct.className = 'dshwv-volpct'
  volPct.textContent = '90%'
  volInput.addEventListener('input', function () { setVol(volInput.value) })
  var row3 = menuRow()
  row3.appendChild(menuLabel('音量'))
  row3.appendChild(volInput)
  row3.appendChild(volPct)
  var row4 = menuRow()
  row4.appendChild(menuLabel('用量'))
  row4.appendChild(usageSelect)
  var row4b = menuRow()
  row4b.appendChild(menuLabel('记账'))
  row4b.appendChild(ledgerSelect)
  var row5 = menuRow()
  row5.appendChild(menuLabel('峰谷'))
  row5.appendChild(peakSelect)
  var row6 = menuRow()
  row6.appendChild(menuLabel('气泡'))
  row6.appendChild(bubbleToggle)
  var menuSep1 = document.createElement('div')
  menuSep1.className = 'dshwv-menu-sep'
  var row7 = menuRow()
  row7.appendChild(menuLabel('避让滚动条'))
  row7.appendChild(scrollGapToggle)
  row7.appendChild(menuLabel('宽度'))
  row7.appendChild(scrollGapInput)
  row7.appendChild(menuLabel('px'))
  menuBox.appendChild(row1)
  menuBox.appendChild(row2)
  menuBox.appendChild(row3)
  menuBox.appendChild(row4)
  menuBox.appendChild(row4b)
  menuBox.appendChild(row5)
  menuBox.appendChild(row6)
  menuBox.appendChild(menuSep1)
  menuBox.appendChild(row7)

  body.appendChild(img)
  root.appendChild(body)
  root.appendChild(menuBtn)
  document.body.appendChild(root)
  document.body.appendChild(menuBox)

  NS.bubble.create(body)

  var state = {
    scale: 1.5,
    h: 'right',
    hOff: 0,
    v: 'bottom',
    vOff: 0,
    left: 0,
    top: 0,
    scrollGapOn: false,
  }

  var soundOn = true
  var soundVol = 0.9
  var soundSet = 'duck'
  var skin = 'deepseek'
  var usageMode = 'deepseek'
  var ledgerMode = 'ledger'
  var peakMode = 'default'
  var bubbleOn = true
  var scrollGapOn = false
  var scrollGapPx = 17

  var pressAudio = null
  var releaseAudio = null
  var pressing = false
  var pressEnded = false
  var releasePlayed = false
  var releaseTimer = null

  function applySoundSet() {
    try {
      var files = soundSet === 'fx1' ? ['D1.mp3', 'D2.mp3'] : ['Ya1.mp3', 'Ya2.mp3']
      pressAudio = new Audio(chrome.runtime.getURL('assets/' + files[0]))
      pressAudio.preload = 'auto'
      pressAudio.volume = soundVol
      releaseAudio = new Audio(chrome.runtime.getURL('assets/' + files[1]))
      releaseAudio.preload = 'auto'
      releaseAudio.volume = soundVol
    } catch (err) {}
  }
  function playPress() {
    if (!pressAudio || !soundOn) return
    try {
      if (releaseTimer) { clearTimeout(releaseTimer); releaseTimer = null }
      if (releaseAudio) { releaseAudio.pause(); releaseAudio.currentTime = 0 }
      pressing = true
      pressEnded = false
      releasePlayed = false
      pressAudio.onended = function () {
        pressEnded = true
        if (!pressing && !releasePlayed) playRelease()
      }
      pressAudio.currentTime = 0
      var p = pressAudio.play()
      if (p && typeof p.catch === 'function') p.catch(function () {})
    } catch (err) {}
  }
  function playRelease() {
    pressing = false
    if (releasePlayed || !releaseAudio || !soundOn) return
    releasePlayed = true
    try {
      releaseAudio.currentTime = 0
      var p = releaseAudio.play()
      if (p && typeof p.catch === 'function') p.catch(function () {})
    } catch (err) {}
  }

  function saveConfig() {
    send('setConfig', {
      patch: {
        scale: state.scale,
        sound: soundOn,
        vol: soundVol,
        soundSet: soundSet,
        usageMode: usageMode,
        ledgerMode: ledgerMode,
        peakMode: peakMode,
        bubbleOn: bubbleOn,
        scrollGapOn: scrollGapOn,
        scrollGapPx: scrollGapPx,
      },
    }).catch(function () {})
    try {
      var vp = viewport()
      var w = root.offsetWidth || root.getBoundingClientRect().width || 0
      var h = root.offsetHeight || root.getBoundingClientRect().height || 0
      var leftDist = state.left
      var rightDist = vp.w - state.left - w
      var topDist = state.top
      var bottomDist = vp.h - state.top - h
      var hAnchor = leftDist <= rightDist ? 'left' : 'right'
      var hDistRaw = Math.round(Math.min(leftDist, rightDist))
      var gap = scrollGapOn && scrollGapPx > 0 ? scrollGapPx : 0
      var hDist = hAnchor === 'right' ? Math.max(0, hDistRaw - gap) : hDistRaw
      var pos = {
        v: 2,
        hAnchor: hAnchor,
        hDist: hDist,
        vAnchor: topDist <= bottomDist ? 'top' : 'bottom',
        vDist: Math.round(Math.min(topDist, bottomDist)),
      }
      NS.interact.rememberPos(pos)
      chrome.storage.local.set({ pos: pos })
    } catch (err) {}
  }

  function setUsageMode(v) {
    usageMode = v === 'opencode' ? 'opencode' : 'deepseek'
    usageSelect.value = usageMode
    ledgerSelect.disabled = usageMode === 'opencode'
    var p = saveConfig()
    if (p && typeof p.then === 'function') p.then(function () { dataRefresh() })
    else dataRefresh()
  }
  function setLedgerMode(v) {
    ledgerMode = v === 'dsToken' ? 'dsToken' : 'ledger'
    ledgerSelect.value = ledgerMode
    var p = saveConfig()
    if (p && typeof p.then === 'function') p.then(function () { dataRefresh() })
    else dataRefresh()
  }
  function setPeakMode(v) {
    peakMode = v === 'liangwen' || v === 'qiangqiang' ? v : 'default'
    peakSelect.value = peakMode
    saveConfig()
    dataRefresh()
  }
  function setBubbleOn(v) {
    bubbleOn = !!v
    bubbleToggle.checked = bubbleOn
    saveConfig()
  }
  function setScrollGapOn(v) {
    scrollGapOn = !!v
    state.scrollGapOn = scrollGapOn
    scrollGapToggle.checked = scrollGapOn
    scrollGapInput.disabled = !scrollGapOn
    saveConfig()
    NS.interact.settle()
  }
  function setScrollGapPx(v) {
    if (!scrollGapOn) return
    scrollGapPx = Math.max(0, Math.round(Number(v) || 0))
    scrollGapInput.value = String(scrollGapPx)
    saveConfig()
    NS.interact.settle()
  }
  function scaleToDisplay(s) {
    return Math.round((s - MIN_SCALE) / ((MAX_SCALE - MIN_SCALE) / 19)) + 1
  }
  function setScale(v) {
    var next = Math.round(Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(v))) * 10) / 10
    var prevTrans = root.style.transition
    root.style.transition = 'none'
    var rect = root.getBoundingClientRect()
    var fx = state.h === 'left' ? rect.left : rect.right
    var fy = rect.bottom
    state.scale = next
    root.style.setProperty('--dshw-scale', String(next))
    scaleInput.value = String(next)
    scaleNumber.value = String(scaleToDisplay(next))
    saveConfig()
    var r2 = root.getBoundingClientRect()
    var vp = viewport()
    if (state.h === 'left') {
      state.left = Math.min(Math.max(fx, 0), Math.max(0, vp.w - r2.width))
    } else {
      state.left = Math.min(Math.max(fx - r2.width, 0), Math.max(0, vp.w - r2.width))
    }
    state.top = Math.min(Math.max(fy - r2.height, 0), Math.max(0, vp.h - r2.height))
    NS.interact.settle()
    requestAnimationFrame(function () {
      root.style.transition = prevTrans
    })
  }
  function setVol(v) {
    var next = Math.round(Math.min(1, Math.max(0, Number(v))) * 100) / 100
    soundVol = next
    soundOn = next > 0
    volInput.value = String(next)
    volPct.textContent = Math.round(next * 100) + '%'
    try {
      if (pressAudio) pressAudio.volume = next
      if (releaseAudio) releaseAudio.volume = next
    } catch (err) {}
    saveConfig()
  }
  function setSoundSet(v) {
    soundSet = v === 'fx1' ? 'fx1' : 'duck'
    soundSelect.value = soundSet
    applySoundSet()
    saveConfig()
  }

  function applySkin(next) {
    skin = next === 'ybb' ? 'ybb' : 'deepseek'
    root.classList.toggle('dshwv-skin-ybb', skin === 'ybb')
    img.src = chrome.runtime.getURL(skin === 'ybb' ? 'assets/YBBniang1.png' : 'assets/DSniang1.png')
    NS.interact.refreshHitTest()
  }

  function applyVisibility(cfg) {
    var hidden = !!(cfg && (cfg.paused || (cfg.hiddenSites || []).indexOf(location.origin) !== -1))
    root.style.display = hidden ? 'none' : ''
    menuBox.style.display = hidden ? 'none' : ''
    if (hidden && NS.interact.isMenuOpen()) NS.interact.closeMenu()
  }

  function onWhaleClick() {
    if (bubbleOn) NS.bubble.open()
    dataRefresh()
  }

  function dataRefresh() {
    NS.data.ensure()
    NS.data.refresh()
  }

  NS.bus.on('pages:update', function (evt) {
    NS.bubble.setPages(evt.pageSet, evt.replace)
  })

  NS.interact.init({
    root: root,
    body: body,
    img: img,
    menuBtn: menuBtn,
    menuBox: menuBox,
    state: state,
    getRightGap: function () {
      return scrollGapOn && scrollGapPx > 0 ? scrollGapPx : 0
    },
    onPressDown: playPress,
    onPressUp: playRelease,
    onWhaleClick: onWhaleClick,
    onDragEndSave: saveConfig,
  })

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local' || !changes.config) return
    var c = changes.config.newValue || {}
    applyVisibility(c)
    if (typeof c.usageMode === 'string') {
      usageMode = c.usageMode === 'opencode' ? 'opencode' : 'deepseek'
      usageSelect.value = usageMode
      ledgerSelect.disabled = usageMode === 'opencode'
    }
    if (typeof c.ledgerMode === 'string') {
      ledgerMode = c.ledgerMode === 'dsToken' ? 'dsToken' : 'ledger'
      ledgerSelect.value = ledgerMode
    }
    if (typeof c.skin === 'string') applySkin(c.skin)
  })

  function buildUsageOptions(meta) {
    if (!meta || typeof meta !== 'object') return
    usageSelect.innerHTML = ''
    var keys = Object.keys(meta)
    for (var i = 0; i < keys.length; i++) {
      var m = meta[keys[i]]
      if (!m) continue
      var o = soundOpt(m.id, m.label + (m.pending ? '（' + m.pending + ' 接入）' : ''))
      if (m.pending) o.disabled = true
      usageSelect.appendChild(o)
    }
    usageSelect.value = usageMode
  }

  function init() {
    Promise.all([send('getConfig'), chrome.storage.local.get('pos')]).then(function (parts) {
      var d = parts[0]
      if (d) {
        if (typeof d.scale === 'number' && d.scale >= MIN_SCALE - 0.1 && d.scale <= MAX_SCALE + 0.1) {
          state.scale = d.scale
          root.style.setProperty('--dshw-scale', String(d.scale))
          scaleInput.value = String(d.scale)
          scaleNumber.value = String(scaleToDisplay(d.scale))
        }
        if (typeof d.vol === 'number') {
          soundVol = d.vol
          soundOn = soundVol > 0
          volInput.value = String(soundVol)
          volPct.textContent = Math.round(soundVol * 100) + '%'
          try {
            if (pressAudio) pressAudio.volume = soundVol
            if (releaseAudio) releaseAudio.volume = soundVol
          } catch (err) {}
        }
        if (typeof d.soundSet === 'string') {
          soundSet = d.soundSet === 'fx1' ? 'fx1' : 'duck'
          soundSelect.value = soundSet
          applySoundSet()
        }
        if (typeof d.skin === 'string') applySkin(d.skin)
        if (typeof d.usageMode === 'string') {
          usageMode = d.usageMode === 'opencode' ? 'opencode' : 'deepseek'
          usageSelect.value = usageMode
          ledgerSelect.disabled = usageMode === 'opencode'
        }
        if (typeof d.ledgerMode === 'string') {
          ledgerMode = d.ledgerMode === 'dsToken' ? 'dsToken' : 'ledger'
          ledgerSelect.value = ledgerMode
        }
        if (typeof d.peakMode === 'string') {
          peakMode = d.peakMode === 'liangwen' || d.peakMode === 'qiangqiang' ? d.peakMode : 'default'
          peakSelect.value = peakMode
        }
        if (typeof d.bubbleOn === 'boolean') {
          bubbleOn = d.bubbleOn
          bubbleToggle.checked = bubbleOn
        }
        if (typeof d.scrollGapOn === 'boolean') {
          scrollGapOn = d.scrollGapOn
          state.scrollGapOn = scrollGapOn
          scrollGapToggle.checked = scrollGapOn
          scrollGapInput.disabled = !scrollGapOn
        }
        if (typeof d.scrollGapPx === 'number') {
          scrollGapPx = d.scrollGapPx > 0 ? Math.round(d.scrollGapPx) : 0
          scrollGapInput.value = String(scrollGapPx)
        }
        applyVisibility(d)
      }
      if (parts[1] && parts[1].pos) {
        NS.interact.rememberPos(parts[1].pos)
        NS.interact.applyAnchorPos(parts[1].pos)
      }
      NS.interact.settle()
      send('getProviders').then(buildUsageOptions)
      NS.data.ensure()
    })
  }

  init()
})()
