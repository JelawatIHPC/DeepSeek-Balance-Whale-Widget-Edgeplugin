;(function () {
  var NS = (window.__DSHW = window.__DSHW || {})
  var consts = NS.consts
  var clamp = NS.util.clamp

  var els = null
  var shown = false
  var pages = []
  var meta = { loading: true, fellBack: false }
  var pageIdx = 0
  var rotateTimer = null
  var closeTimer = null

  function nextIndex(idx, len) {
    if (!(len > 1)) return -1
    return idx + 1 < len ? idx + 1 : -1
  }

  function clearTimers() {
    if (rotateTimer) { clearTimeout(rotateTimer); rotateTimer = null }
    if (closeTimer) { clearTimeout(closeTimer); closeTimer = null }
  }

  function create(parentBody) {
    var box = document.createElement('div')
    box.className = 'dshwv-bubble'
    box.innerHTML =
      '<svg viewBox="0 0 1026 700" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">' +
      '<path class="dshwv-bshape" fill="#FFFFFF" stroke="#203170" stroke-width="18" stroke-linejoin="round" stroke-linecap="round" d="M 827 248 A 373 232 0 1 0 81 246 A 373 232 0 0 0 301 465 A 57 32 10 0 0 413 484 A 373 232 0 0 0 827 248 Z"/>' +
      '<ellipse class="dshwv-b1" cx="352" cy="561" rx="37.5" ry="26" fill="#FFFFFF" stroke="#203170" stroke-width="18"/>' +
      '<ellipse class="dshwv-b2" cx="442" cy="646" rx="24.5" ry="18" fill="#FFFFFF" stroke="#203170" stroke-width="18"/>' +
      '</svg>'
    var text = document.createElement('div')
    text.className = 'dshwv-text'
    var label = document.createElement('div')
    label.className = 'dshwv-label'
    label.textContent = 'DeepSeek 余额'
    var amount = document.createElement('div')
    amount.className = 'dshwv-amount'
    var hint = document.createElement('div')
    hint.className = 'dshwv-hint'
    text.appendChild(label)
    text.appendChild(amount)
    text.appendChild(hint)
    box.appendChild(text)
    box.addEventListener('click', function (e) {
      e.stopPropagation()
      if (!shown) return
      advanceOrClose()
      startRotation()
    })
    hint.addEventListener('click', function (e) {
      e.stopPropagation()
      if (!shown) return
      advanceOrClose()
      startRotation()
    })
    parentBody.appendChild(box)
    els = { box: box, label: label, amount: amount, hint: hint }
  }

  function currentPage() {
    if (!pages.length) return null
    return pages[Math.min(pageIdx, pages.length - 1)]
  }

  function renderCurrent() {
    var p = currentPage()
    if (!p) {
      els.label.style.display = 'none'
      els.label.textContent = ''
      els.amount.textContent = meta.loading ? '…' : '--'
      els.hint.style.display = 'none'
      els.hint.textContent = ''
      return
    }
    els.label.style.display = p.label ? '' : 'none'
    els.label.textContent = p.label || ''
    els.amount.style.color = ''
    els.amount.className = (p.mainStyle === 'A' ? 'dshwv-label' : 'dshwv-amount') + (p.wrap && p.mainStyle === 'A' ? ' dshwv-wrap' : '')
    els.amount.textContent = p.main !== undefined && p.main !== null ? p.main : '--'
    var sub = p.sub || ''
    if (meta.fellBack) sub = sub ? sub + ' · 已回落' : '已回落'
    if (sub) {
      els.hint.style.display = ''
      els.hint.className = 'dshwv-hint dshwv-wrap'
      els.hint.textContent = sub
    } else {
      els.hint.style.display = 'none'
      els.hint.className = 'dshwv-hint'
      els.hint.textContent = ''
    }
  }

  function startRotation() {
    clearTimers()
    if (!shown) return
    if (pages.length > 1) {
      rotateTimer = setTimeout(function () {
        rotateTimer = null
        advanceOrClose()
        startRotation()
      }, consts.ROTATE_MS)
    } else {
      closeTimer = setTimeout(hide, consts.BUBBLE_MS)
    }
  }

  function advanceOrClose() {
    var n = nextIndex(pageIdx, pages.length)
    if (n < 0) {
      hide()
      return false
    }
    pageIdx = n
    renderCurrent()
    return true
  }

  function open() {
    if (shown) {
      startRotation()
      return
    }
    shown = true
    pageIdx = 0
    renderCurrent()
    els.box.classList.add('dshwv-bubble-open')
    startRotation()
  }

  function hide() {
    clearTimers()
    shown = false
    els.box.classList.remove('dshwv-bubble-open')
  }

  function setPages(pageSet, replace) {
    var incoming = (pageSet && pageSet.pages) || []
    meta = pageSet || { loading: true, fellBack: false }
    var hadPages = pages.length > 0
    if (replace) {
      pages = incoming.slice()
    } else {
      var incomingDialogue = incoming.filter(function (p) { return p && p.kind === 'dialogue' })
      var freshData = incoming.filter(function (p) { return p && p.kind !== 'dialogue' })
      var keptDialogue = incomingDialogue.length > 0 ? incomingDialogue : pages.filter(function (p) { return p && p.kind === 'dialogue' })
      pages = freshData.concat(keptDialogue)
    }
    pageIdx = clamp(pageIdx, 0, Math.max(0, pages.length - 1))
    if (!shown) return
    if (!hadPages && pages.length > 0) {
      pageIdx = 0
      renderCurrent()
      startRotation()
      return
    }
    renderCurrent()
  }

  NS.bubble = {
    create: create,
    open: open,
    hide: hide,
    setPages: setPages,
    isActive: function () { return shown },
    pageCount: function () { return pages.length },
  }
})()
