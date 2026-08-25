;(function () {
  var NS = (window.__DSHW = window.__DSHW || {})
  var consts = NS.consts
  var clamp = NS.util.clamp
  var viewport = NS.util.viewport

  var deps = null
  var drag = null
  var lastPos = null
  var menuOpen = false
  var hitCanvas = null
  var hitReady = false
  var widgetCursor = ''

  function rightGap() {
    return deps && typeof deps.getRightGap === 'function' ? deps.getRightGap() : 0
  }

  function express() {
    deps.root.style.right = 'auto'
    deps.root.style.bottom = 'auto'
    deps.root.style.left = deps.state.left + 'px'
    deps.root.style.top = deps.state.top + 'px'
    deps.root.classList.toggle('dshwv-left', deps.state.h === 'left')
  }

  function settle() {
    var vp = viewport()
    var w = deps.root.offsetWidth || deps.root.getBoundingClientRect().width || 0
    var h = deps.root.offsetHeight || deps.root.getBoundingClientRect().height || 0
    if (drag && drag.active) {
      deps.state.left = clamp(deps.state.left, 0, Math.max(0, vp.w - w - rightGap()))
      deps.state.top = clamp(deps.state.top, 0, Math.max(0, vp.h - h))
      express()
      return
    }
    if (deps.state.h === 'right') {
      deps.state.left = Math.max(0, vp.w - w - deps.state.hOff - rightGap())
    } else if (deps.state.h === 'left') {
      deps.state.left = deps.state.hOff
    } else {
      deps.state.left = clamp(deps.state.left, 0, Math.max(0, vp.w - w - rightGap()))
    }
    if (deps.state.v === 'bottom') {
      deps.state.top = Math.max(0, vp.h - h - deps.state.vOff)
    } else if (deps.state.v === 'top') {
      deps.state.top = deps.state.vOff
    } else {
      deps.state.top = clamp(deps.state.top, 0, Math.max(0, vp.h - h))
    }
    express()
  }

  function snapCheck() {
    var rect = deps.root.getBoundingClientRect()
    var vp = viewport()
    var w = rect.width, h = rect.height
    var left = rect.left, top = rect.top
    var centerX = left + w / 2
    var centerY = top + h / 2
    var moved = false
    if (centerX < vp.w / 4) {
      deps.state.h = 'left'
      deps.state.hOff = 0
      left = 0
      moved = true
    } else if (centerX > vp.w * 3 / 4) {
      deps.state.h = 'right'
      deps.state.hOff = 0
      left = vp.w - w - rightGap()
      moved = true
    } else {
      deps.state.h = null
      deps.state.hOff = left
    }
    if (centerY < vp.h / 4) {
      deps.state.v = 'top'
      deps.state.vOff = 0
      top = 0
      moved = true
    } else {
      deps.state.v = 'bottom'
      deps.state.vOff = Math.max(0, vp.h - top - h)
    }
    if (moved) {
      deps.state.left = left
      deps.state.top = top
      settle()
    }
  }

  function toggleMenu() {
    menuOpen = !menuOpen
    if (menuOpen) positionMenu()
    deps.menuBox.classList.toggle('dshwv-menu-open', menuOpen)
    if (menuOpen) deps.menuBtn.classList.add('dshwv-menu-btn-visible')
  }

  function closeMenu() {
    menuOpen = false
    deps.menuBox.classList.remove('dshwv-menu-open')
    deps.root.style.transition = ''
    snapCheck()
  }

  function positionMenu() {
    try {
      var r = deps.root.getBoundingClientRect()
      var b = deps.menuBtn.getBoundingClientRect()
      var vp = viewport()
      var onLeft = r.left + r.width / 2 < vp.w / 2
      if (onLeft) {
        deps.menuBox.style.left = b.left + 'px'
        deps.menuBox.style.right = 'auto'
        deps.menuBox.style.transformOrigin = 'bottom left'
      } else {
        deps.menuBox.style.right = (vp.w - b.right) + 'px'
        deps.menuBox.style.left = 'auto'
        deps.menuBox.style.transformOrigin = 'bottom right'
      }
      deps.menuBox.style.bottom = (vp.h - b.top) + 'px'
      deps.menuBox.style.top = 'auto'
    } catch (err) {}
  }

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
      probe.src = deps.img.src
    } catch (err) {}
  }

  function isWhaleHit(e) {
    if (!hitCanvas || !hitReady) return true
    try {
      var r = deps.img.getBoundingClientRect()
      if (!r || r.width <= 0 || r.height <= 0) return false
      var lx = ((e.clientX - r.left) / r.width) * 610
      var ly = ((e.clientY - r.top) / r.height) * 610
      if (lx < 0 || ly < 0 || lx >= 610 || ly >= 610) return false
      if (deps.state.h === 'left') lx = 610 - lx
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
    var rect = deps.root.getBoundingClientRect()
    drag = { active: true, startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top, w: rect.width, h: rect.height, moved: false, vp: vp }
    deps.root.classList.add('dshwv-dragging')
    deps.body.style.transform = consts.SQUISH
    deps.onPressDown()
    setWidgetCursor('grabbing')
    document.addEventListener('pointermove', onDocPointerMove, true)
    document.addEventListener('pointerup', onDocPointerUp, true)
    document.addEventListener('pointercancel', onDocPointerCancel, true)
  }

  function onDocPointerMove(e) {
    if (!drag || !drag.active) return
    var dx = e.clientX - drag.startX
    var dy = e.clientY - drag.startY
    if (dx * dx + dy * dy >= consts.CLICK_SQ) drag.moved = true
    deps.state.left = clamp(drag.origLeft + dx, 0, Math.max(0, drag.vp.w - drag.w))
    deps.state.top = clamp(drag.origTop + dy, 0, Math.max(0, drag.vp.h - drag.h))
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
      deps.menuBtn.classList.add('dshwv-menu-btn-visible')
      return
    }
    var over = isWhaleHit(e)
    setWidgetCursor(over ? 'grab' : '')
    deps.menuBtn.classList.toggle('dshwv-menu-btn-visible', over || menuOpen)
  }

  function endDrag(e, clickAllowed) {
    if (!drag || !drag.active) return
    drag.active = false
    document.removeEventListener('pointermove', onDocPointerMove, true)
    document.removeEventListener('pointerup', onDocPointerUp, true)
    document.removeEventListener('pointercancel', onDocPointerCancel, true)
    deps.body.style.transform = 'scaleY(1) scaleX(1)'
    deps.onPressUp()
    deps.root.classList.remove('dshwv-dragging')
    setWidgetCursor(isWhaleHit(e) ? 'grab' : '')
    if (clickAllowed && !drag.moved) {
      deps.onWhaleClick()
      return
    }
    var dx = e.clientX - drag.startX
    var dy = e.clientY - drag.startY
    var left = clamp(drag.origLeft + dx, 0, Math.max(0, drag.vp.w - drag.w))
    var top = clamp(drag.origTop + dy, 0, Math.max(0, drag.vp.h - drag.h))
    var centerX = left + drag.w / 2
    var centerY = top + drag.h / 2
    if (centerX < drag.vp.w / 4) {
      deps.state.h = 'left'
      deps.state.hOff = 0
    } else if (centerX > drag.vp.w * 3 / 4) {
      deps.state.h = 'right'
      deps.state.hOff = 0
    } else {
      deps.state.h = null
      deps.state.hOff = left
    }
    if (centerY < drag.vp.h / 4) {
      deps.state.v = 'top'
      deps.state.vOff = 0
    } else if (centerY > drag.vp.h * 3 / 4) {
      deps.state.v = 'bottom'
      deps.state.vOff = 0
    } else {
      deps.state.v = null
      deps.state.vOff = top
    }
    deps.state.left = left
    deps.state.top = top
    settle()
    deps.onDragEndSave()
  }

  function applyAnchorPos(posObj) {
    try {
      var a = posObj
      if (!a || a.v !== 2 || (a.hAnchor !== 'left' && a.hAnchor !== 'right') || typeof a.hDist !== 'number' ||
          (a.vAnchor !== 'top' && a.vAnchor !== 'bottom') || typeof a.vDist !== 'number') return false
      var vp = viewport()
      var w = deps.root.offsetWidth || deps.root.getBoundingClientRect().width || 0
      var h = deps.root.offsetHeight || deps.root.getBoundingClientRect().height || 0
      var effectiveRightDist = a.hAnchor === 'right' ? a.hDist + (deps.state.scrollGapOn ? rightGap() : 0) : a.hDist
      var l = a.hAnchor === 'left' ? a.hDist : vp.w - effectiveRightDist - w
      var t = a.vAnchor === 'top' ? a.vDist : vp.h - a.vDist - h
      deps.state.left = clamp(l, 0, Math.max(0, vp.w - w))
      deps.state.top = clamp(t, 0, Math.max(0, vp.h - h))
      deps.state.h = a.hAnchor
      deps.state.hOff = 0
      deps.state.v = a.vAnchor
      deps.state.vOff = 0
      express()
      return true
    } catch (err) { return false }
  }

  function init(d) {
    deps = d
    deps.state.scrollGapOn = !!deps.state.scrollGapOn
    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('click', onDocClickStopper, true)
    document.addEventListener('pointermove', onDocPointerMoveCursor, true)
    window.addEventListener('resize', function () {
      if (deps.state.h === null && deps.state.v === null && lastPos && applyAnchorPos(lastPos)) return
      settle()
    })
    setupHitTest()
  }

  NS.interact = {
    init: init,
    settle: settle,
    closeMenu: closeMenu,
    toggleMenu: toggleMenu,
    rememberPos: function (p) { lastPos = p },
    applyAnchorPos: applyAnchorPos,
    refreshHitTest: setupHitTest,
    isMenuOpen: function () { return menuOpen },
  }
})()
