;(function () {
  if (window.__dshWhaleWidget) return
  window.__dshWhaleWidget = true

  var MIN_SCALE = 0.6
  var MAX_SCALE = 2.5
  var STEP = 0.1
  var CLICK_SQ = 9
  var CHANGE_MS = 900
  var ANIM_MS = 700
  var BUBBLE_MS = 5000
  var ROTATE_MS = 5000
  var IMG_URL = chrome.runtime.getURL('assets/DSniang1.png')
  var GIF_URL = chrome.runtime.getURL('assets/rua.gif')

  function send(type, payload) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(Object.assign({ type: type }, payload || {}), function (r) {
          if (chrome.runtime.lastError) return resolve(null)
          resolve(r)
        })
      } catch (err) { resolve(null) }
    })
  }

  var root = document.createElement('div')
  root.className = 'dshwv-root'

  var img = document.createElement('img')
  img.className = 'dshwv-img'
  img.src = IMG_URL
  img.alt = 'DeepSeek 余额'
  img.draggable = false

  var menuBtn = document.createElement('button')
  menuBtn.type = 'button'
  menuBtn.className = 'dshwv-menu-btn'
  menuBtn.title = '菜单'
  menuBtn.innerHTML = '<span></span><span></span><span></span>'
  menuBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu() })

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
  scaleNumber.addEventListener('focus', function () { root.style.transition = 'none' })
  scaleNumber.addEventListener('blur', function () { root.style.transition = '' })
  scaleNumber.addEventListener('input', function () {
    var v = Math.round(Number(scaleNumber.value))
    var s = MIN_SCALE + Math.max(0, Math.min(20, v) - 1) * (MAX_SCALE - MIN_SCALE) / 19
    setScale(s)
  })
  scaleNumber.addEventListener('change', function () {
    var v = Math.round(Number(scaleNumber.value))
    var s = MIN_SCALE + Math.max(0, Math.min(20, v) - 1) * (MAX_SCALE - MIN_SCALE) / 19
    setScale(s)
    root.style.transition = ''
  })
  var soundSelect = document.createElement('select')
  soundSelect.className = 'dshwv-sound'
  function soundOpt(value, label) {
    var o = document.createElement('option')
    o.value = value
    o.textContent = label
    return o
  }
  soundSelect.appendChild(soundOpt('duck', '小黄鸭'))
  soundSelect.appendChild(soundOpt('fx1', '音效1'))
  soundSelect.addEventListener('change', function () { setSoundSet(soundSelect.value) })
  var usageSelect = document.createElement('select')
  usageSelect.className = 'dshwv-sound'
  usageSelect.addEventListener('change', function () { setUsageMode(usageSelect.value) })
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
  var ledgerSelect = document.createElement('select')
  ledgerSelect.className = 'dshwv-sound'
  ledgerSelect.appendChild(soundOpt('ledger', '小鲸鱼记账'))
  ledgerSelect.appendChild(soundOpt('dsToken', '实时·令牌'))
  ledgerSelect.title = 'Deepseek 模式的今日已用记账方式'
  ledgerSelect.addEventListener('change', function () { setLedgerMode(ledgerSelect.value) })
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

  var textBox = document.createElement('div')
  textBox.className = 'dshwv-text'
  var labelEl = document.createElement('div')
  labelEl.className = 'dshwv-label'
  labelEl.textContent = 'DeepSeek 余额'
  var amountEl = document.createElement('div')
  amountEl.className = 'dshwv-amount'
  var hintEl = document.createElement('div')
  hintEl.className = 'dshwv-hint'
  textBox.appendChild(labelEl)
  textBox.appendChild(amountEl)
  textBox.appendChild(hintEl)
  hintEl.addEventListener('click', function (e) {
    e.stopPropagation()
    if (!bubbleShown) return
    if (usageMode === 'opencode') {
      if (opencodeAdvanceOrClose()) startOpencodeRotation()
      return
    }
    if (state.pages && state.pages.length > 1) {
      state.pageIdx = (state.pageIdx + 1) % state.pages.length
      render()
    }
  })

  var bubbleBox = document.createElement('div')
  bubbleBox.className = 'dshwv-bubble'
  bubbleBox.innerHTML = '<svg viewBox="0 0 1026 700" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
    '<path class="dshwv-bshape" fill="#FFFFFF" stroke="#203170" stroke-width="18" stroke-linejoin="round" stroke-linecap="round" d="M 827 248 A 373 232 0 1 0 81 246 A 373 232 0 0 0 301 465 A 57 32 10 0 0 413 484 A 373 232 0 0 0 827 248 Z"/>' +
    '<ellipse class="dshwv-b1" cx="352" cy="561" rx="37.5" ry="26" fill="#FFFFFF" stroke="#203170" stroke-width="18"/>' +
    '<ellipse class="dshwv-b2" cx="442" cy="646" rx="24.5" ry="18" fill="#FFFFFF" stroke="#203170" stroke-width="18"/>' +
    '</svg>'
  var gifEl = document.createElement('img')
  gifEl.className = 'dshwv-gif'
  gifEl.src = GIF_URL
  gifEl.alt = ''
  gifEl.draggable = false
  bubbleBox.appendChild(gifEl)
  var gifFailed = false
  gifEl.onerror = function () { gifFailed = true }
  bubbleBox.appendChild(textBox)
  bubbleBox.addEventListener('click', function (e) {
    e.stopPropagation()
    if (!bubbleShown) return
    if (usageMode === 'opencode') {
      if (opencodeAdvanceOrClose()) startOpencodeRotation()
      return
    }
    if (bubbleRandomActive) {
      hideBubble()
    } else {
      bubbleRandomActive = true
      bubbleRandomLines = pickRandomLines()
      swapBubbleContent(function () { applyBubbleLines(bubbleRandomLines) })
      if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
      bubbleTimer = setTimeout(hideBubble, BUBBLE_MS)
    }
  })

  var body = document.createElement('div')
  body.className = 'dshwv-body'
  body.appendChild(img)
  body.appendChild(bubbleBox)
  root.appendChild(body)
  root.appendChild(menuBtn)
  document.body.appendChild(root)
  document.body.appendChild(menuBox)

  var state = {
    scale: 1.5,
    h: 'right',
    hOff: 0,
    v: 'bottom',
    vOff: 0,
    left: 0,
    top: 0,
    balance: null,
    currency: null,
    todayUsage: null,
    isPeak: false,
    usageFellBack: false,
    pages: [],
    pageIdx: 0,
    status: 'loading',
    message: ''
  }
  var busy = false
  var pendingRefresh = false
  var settleTimer = null
  var animDelayTimer = null
  var drag = null
  var shown = null
  var animId = null
  var bubbleShown = false
  var bubbleTimer = null
  var bubbleRandomActive = false
  var bubbleRandomLines = null
  var BUBBLE_STYLE_CLASS = { A: 'dshwv-label', B: 'dshwv-amount', P: 'dshwv-period', C: 'dshwv-hint' }
  function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)] }
  function singleCenter(style, text, color, wrap) { return [null, { t: text, s: style, c: color || '', w: !!wrap }, null] }
  function buildGroup1() {
    var peak = !!state.isPeak
    var offText = '空闲时段'
    var peakText = '高峰时段'
    if (peakMode === 'liangwen') {
      offText = '梁文谷'
      peakText = '梁文峰'
    } else if (peakMode === 'qiangqiang') {
      offText = '!?谷谷?!'
      peakText = '!?峰峰?!'
    }
    return [
      { t: '当前时间段为:', s: 'A', c: '' },
      { t: peak ? peakText : offText, s: 'P', c: peak ? '#e0433f' : '#2fa24c' },
      { t: '今日已用 ' + pageMainText(), s: 'C', c: '' },
    ]
  }
  function pageMainText() {
    var p = state.pages && state.pages[Math.min(state.pageIdx, Math.max(0, (state.pages.length || 1) - 1))]
    if (p) return p.main + (p.sub ? ' · ' + p.sub : '')
    return state.todayUsage !== null && state.todayUsage !== undefined ? fmt(state.todayUsage, state.currency) : '--'
  }
  var RANDOM_GROUPS = [
    { w: 45, lines: buildGroup1 },
    { w: 7, lines: function () { return singleCenter('B', pickOne(['好模型... ↓', '好女孩...↓'])) } },
    { w: 7, lines: function () { return singleCenter('A', pickOne(['不知道用户有什么用，先赶走吧~', '我...我...我也要挣钱吗？', '我去吃饭啦，测完叫我', '压力一只蓝色大肥鱼？！', 'DeepSleep...', '坏了...用户彻底怒了！']), '', true) } },
    { w: 10, lines: function () { return { gif: true } } },
    { w: 3, lines: function () { return singleCenter('A', pickOne(['你目录里的dsh是什么...大烧货吗...?', '恭喜你实现token自由！token全跑了！', '真当我是便宜货啊...']), '', true) } },
    { w: 1, lines: function () { return singleCenter('B', '哦鲸鲸... ') } },
  ]
  function pickRandomLines() {
    var total = 0
    for (var i = 0; i < RANDOM_GROUPS.length; i++) total += RANDOM_GROUPS[i].w
    var r = Math.random() * total
    for (var i = 0; i < RANDOM_GROUPS.length; i++) {
      r -= RANDOM_GROUPS[i].w
      if (r < 0) return RANDOM_GROUPS[i].lines()
    }
    return RANDOM_GROUPS[RANDOM_GROUPS.length - 1].lines()
  }
  function applyBubbleLines(lines) {
    if (lines && lines.gif) {
      if (gifFailed) {
        lines = singleCenter('A', pickOne(['gif 加载失败了...', '今天没有动图给你看~', '呜呜 动图不见了...']), '', true)
      } else {
        if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
        gifEl.style.display = 'block'
        gifEl.style.opacity = ''
        labelEl.style.display = 'none'
        amountEl.style.display = 'none'
        hintEl.style.display = 'none'
        return
      }
    }
    if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
    gifEl.style.display = 'none'
    gifEl.style.opacity = ''
    var els = [labelEl, amountEl, hintEl]
    for (var i = 0; i < 3; i++) {
      var el = els[i]
      var ln = lines && lines[i]
      if (ln) {
        el.style.display = ''
        el.className = (BUBBLE_STYLE_CLASS[ln.s] || 'dshwv-label') + (ln.w ? ' dshwv-wrap' : '')
        el.textContent = ln.t
        el.style.color = ln.c || ''
      } else {
        el.style.display = 'none'
        el.textContent = ''
        el.style.color = ''
      }
    }
  }
  var bubbleSwapTimer = null
  var hintFadeTimer = null
  var gifFadeTimer = null
  var lastHintText = null
  function setHint(text) {
    if (text === lastHintText) return
    var first = lastHintText === null
    lastHintText = text
    if (first || !bubbleShown) {
      hintEl.textContent = text
      return
    }
    hintEl.style.transition = 'opacity .18s ease'
    hintEl.style.opacity = '0'
    hintFadeTimer = setTimeout(function () {
      hintFadeTimer = null
      hintEl.textContent = text
      hintEl.style.opacity = '1'
      setTimeout(function () {
        hintEl.style.transition = ''
        hintEl.style.opacity = ''
      }, 220)
    }, 190)
  }
  function swapBubbleContent(applyFn) {
    if (bubbleSwapTimer) { clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null }
    textBox.style.transition = 'opacity .18s ease'
    textBox.style.opacity = '0'
    bubbleSwapTimer = setTimeout(function () {
      bubbleSwapTimer = null
      applyFn()
      textBox.style.opacity = '1'
      setTimeout(function () {
        textBox.style.transition = ''
        textBox.style.opacity = ''
      }, 220)
    }, 190)
  }
  function restoreBubbleLines() {
    if (bubbleSwapTimer) { clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null }
    if (hintFadeTimer) { clearTimeout(hintFadeTimer); hintFadeTimer = null }
    if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
    lastHintText = null
    textBox.style.transition = ''
    textBox.style.opacity = ''
    gifEl.style.display = 'none'
    gifEl.style.opacity = ''
    labelEl.style.display = ''
    labelEl.className = 'dshwv-label'
    labelEl.textContent = 'DeepSeek 余额'
    labelEl.style.color = ''
    amountEl.style.display = ''
    amountEl.className = 'dshwv-amount'
    amountEl.style.color = ''
    hintEl.style.display = ''
    hintEl.className = 'dshwv-hint'
    hintEl.style.color = ''
    render()
  }
  function showBubble() {
    if (!bubbleOn) return
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
    if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
    bubbleShown = true
    bubbleRandomActive = false
    restoreBubbleLines()
    bubbleBox.classList.add('dshwv-bubble-open')
    bubbleTimer = setTimeout(hideBubble, BUBBLE_MS)
  }
  function hideBubble() {
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
    clearOpencodeBubbleTimer()
    if (bubbleSwapTimer) { clearTimeout(bubbleSwapTimer); bubbleSwapTimer = null }
    if (hintFadeTimer) { clearTimeout(hintFadeTimer); hintFadeTimer = null }
    textBox.style.transition = ''
    textBox.style.opacity = ''
    hintEl.style.transition = ''
    hintEl.style.opacity = ''
    bubbleRandomActive = false
    bubbleRandomLines = null
    bubbleShown = false
    bubbleBox.classList.remove('dshwv-bubble-open')
    gifFadeTimer = setTimeout(function () {
      gifFadeTimer = null
      gifEl.style.display = 'none'
    }, 240)
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v) }
  function viewport() {
    return {
      w: window.innerWidth || document.documentElement.clientWidth || 1280,
      h: window.innerHeight || document.documentElement.clientHeight || 800
    }
  }
  function rightGap() {
    if (!scrollGapOn) return 0
    return scrollGapPx > 0 ? scrollGapPx : 0
  }
  function fmt(balance, currency) {
    var num = Number(balance)
    var fixed = isFinite(num) ? num.toFixed(2) : '--'
    return currency === 'CNY' ? '¥ ' + fixed : fixed + ' ' + currency
  }
  function animateAmount(from, to, currency, duration) {
    if (animId) cancelAnimationFrame(animId)
    if (from === null || !isFinite(from)) from = to
    if (from === to) {
      shown = to
      amountEl.textContent = fmt(to, currency)
      return
    }
    var startTime = null
    function step(ts) {
      if (startTime === null) startTime = ts
      var t = Math.min(1, (ts - startTime) / duration)
      var eased = 1 - Math.pow(1 - t, 3)
      var val = from + (to - from) * eased
      amountEl.textContent = fmt(val, currency)
      if (t < 1) {
        animId = requestAnimationFrame(step)
      } else {
        animId = null
        shown = to
        amountEl.textContent = fmt(to, currency)
      }
    }
    animId = requestAnimationFrame(step)
  }
  function render() {
    if (usageMode === 'opencode' && bubbleShown && !bubbleRandomActive) {
      renderUsageBubble()
      return
    }
    var amount, hint
    if (state.status === 'error') {
      amount = shown !== null ? fmt(shown, state.currency) : '--'
      var _e = state.pages && state.pages[Math.min(state.pageIdx, Math.max(0, (state.pages.length || 1) - 1))]
      if (_e) {
        hint = (state.usageFellBack ? '~ ' : '') + (_e.label ? _e.label : '今日已用') + ' ' + pageMainText()
      } else {
        hint = state.message ? state.message.slice(0, 14) : '获取失败 · 点击重试'
      }
    } else if (state.balance === null) {
      amount = shown !== null ? fmt(shown, state.currency) : '…'
      hint = '加载中…'
    } else {
      amount = shown !== null ? fmt(shown, state.currency) : fmt(state.balance, state.currency)
      var _p = state.pages && state.pages[Math.min(state.pageIdx, Math.max(0, (state.pages.length || 1) - 1))]
      hint = (state.usageFellBack ? '~ ' : '') + (_p && _p.label ? _p.label : '今日已用') + ' ' + pageMainText()
    }
    amountEl.textContent = amount
    if (bubbleRandomActive && bubbleRandomLines) {
      applyBubbleLines(bubbleRandomLines)
    } else {
      setHint(hint)
    }
  }
  function express() {
    root.style.right = 'auto'
    root.style.bottom = 'auto'
    root.style.left = state.left + 'px'
    root.style.top = state.top + 'px'
    root.classList.toggle('dshwv-left', state.h === 'left')
  }
  function settle() {
    var vp = viewport()
    var w = root.offsetWidth || root.getBoundingClientRect().width || 0
    var h = root.offsetHeight || root.getBoundingClientRect().height || 0
    if (drag && drag.active) {
      state.left = clamp(state.left, 0, Math.max(0, vp.w - w - rightGap()))
      state.top = clamp(state.top, 0, Math.max(0, vp.h - h))
      express()
      return
    }
    if (state.h === 'right') {
      state.left = Math.max(0, vp.w - w - state.hOff - rightGap())
    } else if (state.h === 'left') {
      state.left = state.hOff
    } else {
      state.left = clamp(state.left, 0, Math.max(0, vp.w - w - rightGap()))
    }
    if (state.v === 'bottom') {
      state.top = Math.max(0, vp.h - h - state.vOff)
    } else if (state.v === 'top') {
      state.top = state.vOff
    } else {
      state.top = clamp(state.top, 0, Math.max(0, vp.h - h))
    }
    express()
  }
  var lastRefresh = null
  function refresh(manual) {
    if (busy) { pendingRefresh = true; return lastRefresh }
    busy = true
    if (animDelayTimer) { clearTimeout(animDelayTimer); animDelayTimer = null }
    if (manual || state.balance === null) { state.status = 'loading'; render() }
    lastRefresh = send('getBalance').then(function (data) {
      if (data) {
        state.pages = Array.isArray(data.pages) ? data.pages : []
        state.pageIdx = Math.min(state.pageIdx, Math.max(0, state.pages.length - 1))
        state.usageFellBack = !!data.usageFellBack
        state.todayUsage = data.todayUsage !== undefined ? data.todayUsage : null
        state.isPeak = !!data.isPeak
        if (usageMode === 'opencode' && bubbleShown) startOpencodeRotation()
      }
      if (data && data.ok) {
        var nb = Number(data.totalBalance)
        var nc = String(data.currency || 'CNY')
        var changed = state.balance !== null && (nb !== state.balance || nc !== state.currency)
        var currencyChanged = state.currency !== null && nc !== state.currency
        state.balance = nb
        state.currency = nc
        state.message = ''
        if (changed && !currencyChanged) {
          if (!manual) {
            showBubble()
            state.status = 'changing'
            if (animDelayTimer) clearTimeout(animDelayTimer)
            animDelayTimer = setTimeout(function () {
              animDelayTimer = null
              animateAmount(shown, nb, nc, ANIM_MS)
            }, 300)
            if (settleTimer) clearTimeout(settleTimer)
            settleTimer = setTimeout(function () {
              settleTimer = null
              if (state.status === 'changing') { state.status = 'ok'; render() }
            }, CHANGE_MS + 300)
          } else {
            animateAmount(shown, nb, nc, ANIM_MS)
            state.status = 'ok'
            render()
          }
        } else {
          if (animId === null) shown = nb
          state.status = 'ok'
          render()
        }
      } else {
        state.status = 'error'
        state.message = (data && data.error) ? String(data.error) : '获取失败'
        render()
      }
    }).catch(function () {
      state.status = 'error'
      state.message = '获取失败'
      render()
    }).finally(function () {
      busy = false
      if (pendingRefresh) {
        pendingRefresh = false
        refresh(false)
      }
    })
    return lastRefresh
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
  var opencodeBubbleTimer = null
  function clearOpencodeBubbleTimer() {
    if (opencodeBubbleTimer) { clearTimeout(opencodeBubbleTimer); opencodeBubbleTimer = null }
  }
  function renderUsageBubble() {
    var p = state.pages && state.pages[Math.min(state.pageIdx, Math.max(0, (state.pages.length || 1) - 1))]
    if (p) {
      labelEl.textContent = p.label || 'Opencode 用量'
      amountEl.textContent = p.main
      amountEl.style.color = ''
      if (p.sub) {
        hintEl.style.display = ''
        hintEl.className = 'dshwv-hint dshwv-wrap'
        hintEl.textContent = p.sub
      } else {
        hintEl.style.display = 'none'
        hintEl.className = 'dshwv-hint'
        hintEl.textContent = ''
      }
      if (state.usageFellBack) {
        hintEl.style.display = ''
        hintEl.textContent = (hintEl.textContent ? hintEl.textContent + ' · ' : '') + '已回落'
      }
    } else {
      labelEl.textContent = 'Opencode 用量'
      amountEl.textContent = state.status === 'loading' ? '…' : '--'
      hintEl.textContent = ''
      hintEl.style.display = 'none'
    }
  }
  function startOpencodeRotation() {
    clearOpencodeBubbleTimer()
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
    if (!bubbleShown) return
    if (state.pages && state.pages.length > 1) {
      opencodeBubbleTimer = setTimeout(opencodeTick, ROTATE_MS)
    } else {
      bubbleTimer = setTimeout(hideBubble, BUBBLE_MS)
    }
  }
  function opencodeAdvanceOrClose() {
    if (!state.pages || state.pageIdx >= state.pages.length - 1) {
      hideBubble()
      return false
    }
    state.pageIdx++
    renderUsageBubble()
    return true
  }
  function opencodeTick() {
    opencodeBubbleTimer = null
    if (opencodeAdvanceOrClose()) {
      opencodeBubbleTimer = setTimeout(opencodeTick, ROTATE_MS)
    }
  }
  function showOpencodeBubble() {
    if (!bubbleOn) return
    if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null }
    if (gifFadeTimer) { clearTimeout(gifFadeTimer); gifFadeTimer = null }
    clearOpencodeBubbleTimer()
    bubbleShown = true
    bubbleRandomActive = false
    lastHintText = null
    state.status = 'loading'
    gifEl.style.display = 'none'
    gifEl.style.opacity = ''
    labelEl.style.display = ''
    labelEl.className = 'dshwv-label'
    labelEl.style.color = ''
    amountEl.style.display = ''
    amountEl.className = 'dshwv-amount'
    amountEl.style.color = ''
    hintEl.style.display = ''
    hintEl.className = 'dshwv-hint'
    hintEl.style.color = ''
    textBox.style.transition = ''
    textBox.style.opacity = ''
    state.pageIdx = 0
    renderUsageBubble()
    bubbleBox.classList.add('dshwv-bubble-open')
    startOpencodeRotation()
  }
  function saveConfig() {
    var p = send('setConfig', {
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
        scrollGapPx: scrollGapPx
      }
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
      var hDist = hAnchor === 'right' && scrollGapOn ? Math.max(0, hDistRaw - rightGap()) : hDistRaw
      lastPos = {
        v: 2,
        hAnchor: hAnchor,
        hDist: hDist,
        vAnchor: topDist <= bottomDist ? 'top' : 'bottom',
        vDist: Math.round(Math.min(topDist, bottomDist))
      }
      chrome.storage.local.set({ pos: lastPos })
    } catch (err) {}
  }
  function setUsageMode(v) {
    usageMode = v === 'opencode' ? 'opencode' : 'deepseek'
    usageSelect.value = usageMode
    ledgerSelect.disabled = usageMode === 'opencode'
    var p = saveConfig()
    if (p && typeof p.then === 'function') p.then(function () { refresh(true) })
    else refresh(true)
  }
  function setLedgerMode(v) {
    ledgerMode = v === 'dsToken' ? 'dsToken' : 'ledger'
    ledgerSelect.value = ledgerMode
    var p = saveConfig()
    if (p && typeof p.then === 'function') p.then(function () { refresh(true) })
    else refresh(true)
  }
  function setPeakMode(v) {
    peakMode = v === 'liangwen' || v === 'qiangqiang' ? v : 'default'
    peakSelect.value = peakMode
    saveConfig()
  }
  function setBubbleOn(v) {
    bubbleOn = !!v
    bubbleToggle.checked = bubbleOn
    saveConfig()
  }
  function setScrollGapOn(v) {
    scrollGapOn = !!v
    scrollGapToggle.checked = scrollGapOn
    scrollGapInput.disabled = !scrollGapOn
    saveConfig()
    settle()
  }
  function setScrollGapPx(v) {
    if (!scrollGapOn) return
    var n = Math.max(0, Math.round(Number(v) || 0))
    scrollGapPx = n
    scrollGapInput.value = String(n)
    saveConfig()
    settle()
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
    express()
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
  var SQUISH = 'scaleY(0.88) scaleX(1.05)'
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
      if (releaseAudio) {
        releaseAudio.pause()
        releaseAudio.currentTime = 0
      }
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
    if (releasePlayed || !releaseAudio || !soundOn) return
    releasePlayed = true
    try {
      releaseAudio.currentTime = 0
      var p = releaseAudio.play()
      if (p && typeof p.catch === 'function') p.catch(function () {})
    } catch (err) {}
  }
  function pressDown() {
    body.style.transform = SQUISH
    pressing = true
    playPress()
  }
  function pressUp() {
    body.style.transform = 'scaleY(1) scaleX(1)'
    pressing = false
    if (pressEnded) {
      playRelease()
      return
    }
    var durKnown = false
    var remainMs = 0
    try {
      var dur = pressAudio ? pressAudio.duration : 0
      if (isFinite(dur) && dur > 0) {
        durKnown = true
        remainMs = (dur - pressAudio.currentTime) * 1000
      }
    } catch (err) {}
    if (durKnown) {
      releaseTimer = setTimeout(function () {
        releaseTimer = null
        playRelease()
      }, Math.max(0, remainMs - 100))
    }
  }
  var menuOpen = false
  function toggleMenu() {
    menuOpen = !menuOpen
    if (menuOpen) positionMenu()
    menuBox.classList.toggle('dshwv-menu-open', menuOpen)
    if (menuOpen) menuBtn.classList.add('dshwv-menu-btn-visible')
  }
  function closeMenu() {
    menuOpen = false
    menuBox.classList.remove('dshwv-menu-open')
    root.style.transition = ''
    snapCheck()
  }
  function snapCheck() {
    var rect = root.getBoundingClientRect()
    var vp = viewport()
    var w = rect.width, h = rect.height
    var left = rect.left, top = rect.top
    var centerX = left + w / 2
    var centerY = top + h / 2
    var moved = false
    if (centerX < vp.w / 4) {
      state.h = 'left'
      state.hOff = 0
      left = 0
      moved = true
    } else if (centerX > vp.w * 3 / 4) {
      state.h = 'right'
      state.hOff = 0
      left = vp.w - w - rightGap()
      moved = true
    } else {
      state.h = null
      state.hOff = left
    }
    if (centerY < vp.h / 4) {
      state.v = 'top'
      state.vOff = 0
      top = 0
      moved = true
    } else {
      state.v = 'bottom'
      state.vOff = Math.max(0, vp.h - top - h)
    }
    if (moved) {
      state.left = left
      state.top = top
      settle()
    }
  }
  function positionMenu() {
    try {
      var r = root.getBoundingClientRect()
      var b = menuBtn.getBoundingClientRect()
      var vp = viewport()
      var onLeft = r.left + r.width / 2 < vp.w / 2
      if (onLeft) {
        menuBox.style.left = b.left + 'px'
        menuBox.style.right = 'auto'
        menuBox.style.transformOrigin = 'bottom left'
      } else {
        menuBox.style.right = (vp.w - b.right) + 'px'
        menuBox.style.left = 'auto'
        menuBox.style.transformOrigin = 'bottom right'
      }
      menuBox.style.bottom = (vp.h - b.top) + 'px'
      menuBox.style.top = 'auto'
    } catch (err) {}
  }

  var hitCanvas = null
  var hitReady = false
  function setupHitTest() {
    try {
      hitReady = false
      hitCanvas = document.createElement('canvas')
      hitCanvas.width = 610
      hitCanvas.height = 610
      var probe = new Image()
      probe.onload = function () {
        try {
          hitCanvas.getContext('2d').drawImage(probe, 0, 0, 610, 610)
          hitReady = true
        } catch (err) {}
      }
      probe.onerror = function () {}
      probe.src = img.src
    } catch (err) {}
  }
  function isWhaleHit(e) {
    if (!hitCanvas || !hitReady) return true
    try {
      var r = img.getBoundingClientRect()
      if (!r || r.width <= 0 || r.height <= 0) return false
      var lx = (e.clientX - r.left) / r.width * 610
      var ly = (e.clientY - r.top) / r.height * 610
      if (lx < 0 || ly < 0 || lx >= 610 || ly >= 610) return false
      if (state.h === 'left') lx = 610 - lx
      var data = hitCanvas.getContext('2d').getImageData(Math.floor(lx), Math.floor(ly), 1, 1).data
      return data[3] > 10
    } catch (err) {
      return true
    }
  }
  function onDocPointerDown(e) {
    if (e.target && e.target.closest) {
      if (e.target.closest('.dshwv-bubble') || e.target.closest('.dshwv-menu') || e.target.closest('.dshwv-menu-btn')) return
    }
    if (menuOpen) {
      closeMenu()
      return
    }
    if (e.button !== 0 && e.pointerType === 'mouse') return
    if (!isWhaleHit(e)) return
    try { e.preventDefault(); e.stopPropagation() } catch (err) {}
    var vp = viewport()
    var rect = root.getBoundingClientRect()
    drag = { active: true, startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top, w: rect.width, h: rect.height, moved: false, vp: vp }
    root.classList.add('dshwv-dragging')
    pressDown()
    setWidgetCursor('grabbing')
    document.addEventListener('pointermove', onDocPointerMove, true)
    document.addEventListener('pointerup', onDocPointerUp, true)
    document.addEventListener('pointercancel', onDocPointerCancel, true)
  }
  function onDocPointerMove(e) {
    if (!drag || !drag.active) return
    var dx = e.clientX - drag.startX
    var dy = e.clientY - drag.startY
    if (dx * dx + dy * dy >= CLICK_SQ) drag.moved = true
    state.left = clamp(drag.origLeft + dx, 0, Math.max(0, drag.vp.w - drag.w))
    state.top = clamp(drag.origTop + dy, 0, Math.max(0, drag.vp.h - drag.h))
    express()
  }
  function onDocPointerUp(e) {
    try { if (isWhaleHit(e)) { e.preventDefault(); e.stopPropagation() } } catch (err) {}
    endDrag(e, true)
  }
  function onDocPointerCancel(e) { endDrag(e, false) }
  function onDocClickStopper(e) {
    if (!isWhaleHit(e)) return
    try { e.preventDefault(); e.stopPropagation() } catch (err) {}
  }
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('click', onDocClickStopper, true)

  var widgetCursor = ''
  function setWidgetCursor(v) {
    if (v !== widgetCursor) {
      widgetCursor = v
      try { document.body.style.cursor = v } catch (err) {}
    }
  }
  function onDocPointerMoveCursor(e) {
    if (drag && drag.active) { setWidgetCursor('grabbing'); return }
    var el = null
    try { el = document.elementFromPoint(e.clientX, e.clientY) } catch (err) {}
    if (el && el.closest && (el.closest('.dshwv-bubble') || el.closest('.dshwv-menu') || el.closest('.dshwv-menu-btn'))) {
      setWidgetCursor('')
      menuBtn.classList.add('dshwv-menu-btn-visible')
      return
    }
    var over = isWhaleHit(e)
    setWidgetCursor(over ? 'grab' : '')
    menuBtn.classList.toggle('dshwv-menu-btn-visible', over || menuOpen)
  }
  document.addEventListener('pointermove', onDocPointerMoveCursor, true)

  function endDrag(e, clickAllowed) {
    if (!drag || !drag.active) return
    drag.active = false
    document.removeEventListener('pointermove', onDocPointerMove, true)
    document.removeEventListener('pointerup', onDocPointerUp, true)
    document.removeEventListener('pointercancel', onDocPointerCancel, true)
    pressUp()
    root.classList.remove('dshwv-dragging')
    setWidgetCursor(isWhaleHit(e) ? 'grab' : '')
    if (clickAllowed && !drag.moved) {
      if (usageMode === 'opencode') showOpencodeBubble()
      else showBubble()
      refresh(true)
      return
    }
    var dx = e.clientX - drag.startX
    var dy = e.clientY - drag.startY
    var left = clamp(drag.origLeft + dx, 0, Math.max(0, drag.vp.w - drag.w))
    var top = clamp(drag.origTop + dy, 0, Math.max(0, drag.vp.h - drag.h))
    var centerX = left + drag.w / 2
    var centerY = top + drag.h / 2
    if (centerX < drag.vp.w / 4) {
      state.h = 'left'
      state.hOff = 0
    } else if (centerX > drag.vp.w * 3 / 4) {
      state.h = 'right'
      state.hOff = 0
    } else {
      state.h = null
      state.hOff = left
    }
    if (centerY < drag.vp.h / 4) {
      state.v = 'top'
      state.vOff = 0
    } else if (centerY > drag.vp.h * 3 / 4) {
      state.v = 'bottom'
      state.vOff = 0
    } else {
      state.v = null
      state.vOff = top
    }
    state.left = left
    state.top = top
    settle()
    saveConfig()
  }
  function applyAnchorPosFromBag(bag) {
    try {
      var raw = bag && bag.pos
      var a = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null
      if (!a || a.v !== 2 || (a.hAnchor !== 'left' && a.hAnchor !== 'right') || typeof a.hDist !== 'number' ||
          (a.vAnchor !== 'top' && a.vAnchor !== 'bottom') || typeof a.vDist !== 'number') return false
      var vp = viewport()
      var w = root.offsetWidth || root.getBoundingClientRect().width || 0
      var h = root.offsetHeight || root.getBoundingClientRect().height || 0
      var effectiveRightDist = a.hAnchor === 'right' ? a.hDist + (scrollGapOn ? rightGap() : 0) : a.hDist
      var l = a.hAnchor === 'left' ? a.hDist : vp.w - effectiveRightDist - w
      var t = a.vAnchor === 'top' ? a.vDist : vp.h - a.vDist - h
      state.left = clamp(l, 0, Math.max(0, vp.w - w))
      state.top = clamp(t, 0, Math.max(0, vp.h - h))
      state.h = a.hAnchor
      state.hOff = 0
      state.v = a.vAnchor
      state.vOff = 0
      express()
      return true
    } catch (err) { return false }
  }
  window.addEventListener('resize', function () {
    if (state.h === null && state.v === null && lastPos && applyAnchorPosFromBag({ pos: lastPos })) return
    settle()
  })

  var rect0 = root.getBoundingClientRect()
  state.left = rect0.left
  state.top = rect0.top
  express()
  render()
  applySoundSet()
  setupHitTest()

  function applySkin(next) {
    skin = next === 'ybb' ? 'ybb' : 'deepseek'
    root.classList.toggle('dshwv-skin-ybb', skin === 'ybb')
    img.src = chrome.runtime.getURL(skin === 'ybb' ? 'assets/YBBniang1.png' : 'assets/DSniang1.png')
    setupHitTest()
  }

  function applyVisibility(cfg) {
    var hidden = !!(cfg && (cfg.paused || (cfg.hiddenSites || []).indexOf(location.origin) !== -1))
    root.style.display = hidden ? 'none' : ''
    menuBox.style.display = hidden ? 'none' : ''
    if (hidden && menuOpen) closeMenu()
  }

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local' || !changes.config) return
    applyVisibility(changes.config.newValue || {})
    var c = changes.config.newValue || {}
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
          scrollGapToggle.checked = scrollGapOn
          scrollGapInput.disabled = !scrollGapOn
        }
        if (typeof d.scrollGapPx === 'number') {
          scrollGapPx = d.scrollGapPx > 0 ? Math.round(d.scrollGapPx) : 0
          scrollGapInput.value = String(scrollGapPx)
        }
        if (d.hiddenSites || typeof d.paused === 'boolean') applyVisibility(d)
      }
      if (parts[1] && parts[1].pos) applyAnchorPosFromBag(parts[1])
      settle()
      send('getProviders').then(function (meta) {
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
      })
      refresh(false)
    })
  }
  init()
})()
