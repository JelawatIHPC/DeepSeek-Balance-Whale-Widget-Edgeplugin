;(function () {
  var NS = (window.__DSHW = window.__DSHW || {})

  var consts = {
    MIN_SCALE: 0.6,
    MAX_SCALE: 2.5,
    STEP: 0.1,
    CLICK_SQ: 9,
    CHANGE_MS: 900,
    ANIM_MS: 700,
    BUBBLE_MS: 5000,
    ROTATE_MS: 5000,
    SQUISH: 'scaleY(0.88) scaleX(1.05)',
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v
  }

  function viewport() {
    return {
      w: window.innerWidth || document.documentElement.clientWidth || 1280,
      h: window.innerHeight || document.documentElement.clientHeight || 800,
    }
  }

  function send(type, payload) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(Object.assign({ type: type }, payload || {}), function (r) {
          if (chrome.runtime.lastError) return resolve(null)
          resolve(r)
        })
      } catch (err) {
        resolve(null)
      }
    })
  }

  var listeners = {}
  var bus = {
    on: function (evt, cb) {
      ;(listeners[evt] = listeners[evt] || []).push(cb)
    },
    emit: function (evt, arg) {
      var list = listeners[evt] || []
      for (var i = 0; i < list.length; i++) {
        try { list[i](arg) } catch (err) {}
      }
    },
  }

  NS.consts = consts
  NS.util = { clamp: clamp, viewport: viewport }
  NS.send = send
  NS.bus = bus
})()
