(function () {
  'use strict';

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var stage = document.querySelector('.stage');
  var slideButtons = Array.prototype.slice.call(document.querySelectorAll('.slide-nav [data-go]'));
  var previousButton = document.querySelector('.previous');
  var nextButton = document.querySelector('.next');
  var announcer = document.querySelector('#slide-announcer');
  var zoomButton = document.querySelector('#zoom-button');
  var magnifierLens = document.querySelector('#magnifier-lens');
  var magnifierContent = document.querySelector('#magnifier-content');
  var fullscreenButton = document.querySelector('#fullscreen-button');
  var furiganaToggle = document.querySelector('#furigana-toggle');
  var furiganaState = document.querySelector('#furigana-state');
  var mobileSlideTrigger = document.querySelector('#mobile-slide-trigger');
  var mobileSlideLabel = document.querySelector('#mobile-slide-label');
  var slideNav = document.querySelector('#slide-nav-list');
  var mobile = window.matchMedia ? window.matchMedia('(max-width: 900px)') : { matches: false };

  var pieTicksGroup = document.querySelector('#pie-ticks');
  var pieReplayBtn = document.querySelector('#pie-replay-btn');
  var pieAllBtn = document.querySelector('#pie-all-btn');
  var sliceGroups = Array.prototype.slice.call(document.querySelectorAll('.pie-slice-group'));
  var legendCards = Array.prototype.slice.call(document.querySelectorAll('.legend-card'));
  var inspectorTitle = document.querySelector('#inspector-title');
  var inspectorFormula = document.querySelector('#inspector-formula');
  var inspectorText = document.querySelector('#inspector-text');

  var PIE_CX = 210;
  var PIE_CY = 210;
  var PIE_R = 148;
  var SWEEP_MS = 1150;
  var LOUPE_MAG = 2.0;
  var XLINK_NS = 'http://www.w3.org/1999/xlink';
  var supportsAspectRatio = Boolean(
    window.CSS && typeof window.CSS.supports === 'function' && window.CSS.supports('aspect-ratio', '16 / 9')
  );

  var SLICES = [
    {
      id: 'sns',
      startDeg: 0,
      endDeg: 240,
      pct: 66.6,
      title: 'SNS（4名 · 66.6%）',
      formula: '4 / 6 = 66.6% · 240°',
      detail: '回答者：Raya（Instagram・9h）／ Arkana（Instagram・YouTube・7h）／ Naila（TikTok・8h）／ Nabila（Twitter・X・5h）。最も高い割合を占めている。'
    },
    {
      id: 'game',
      startDeg: 240,
      endDeg: 300,
      pct: 16.7,
      title: 'ゲーム（1名 · 16.7%）',
      formula: '1 / 6 = 16.7% · 60°',
      detail: '回答者：Ara（ゲーム・8h）。勉強は紙で行うため、スマホでは主にゲームを利用している。'
    },
    {
      id: 'dict',
      startDeg: 300,
      endDeg: 360,
      pct: 16.7,
      title: '日本語辞典（1名 · 16.7%）',
      formula: '1 / 6 = 16.7% · 60°',
      detail: '回答者：Raphael（Takoboto・8h）。わからない日本語の言葉をすぐ調べるために利用している。'
    }
  ];

  var SUMMARY_DETAIL = {
    title: '全体のまとめ（6名）',
    formula: '4/6 + 1/6 + 1/6 = 1',
    detail: '最も割合が高いのはSNSで4名（66.6%）を占める。次にゲームが1名（16.7%）、日本語辞典の利用も同じく1名で16.7%を占めている。'
  };

  var currentSlide = 0;
  var transitionTimer;
  var toastTimer;
  var pieRafId = null;
  var pieFallbackTimer = null;
  var activeSliceId = null;
  var isLoupeActive = false;
  var loupeX = null;
  var loupeY = null;
  var loupeClone = null;

  function nowMs() {
    return window.performance && typeof window.performance.now === 'function'
      ? window.performance.now()
      : Date.now();
  }

  function setUseHref(useEl, id) {
    if (!useEl) return;
    useEl.setAttribute('href', id);
    try {
      useEl.setAttributeNS(XLINK_NS, 'xlink:href', id);
    } catch (err) {
      useEl.setAttribute('xlink:href', id);
    }
  }

  function clearChildren(node) {
    if (!node) return;
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function closestEl(target, selector) {
    if (!target || target.nodeType !== 1) return null;
    if (typeof target.closest === 'function') return target.closest(selector);
    var el = target;
    while (el && el.nodeType === 1) {
      var matches = el.matches || el.msMatchesSelector || el.webkitMatchesSelector;
      if (matches && matches.call(el, selector)) return el;
      el = el.parentElement;
    }
    return null;
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function polarToCartesian(cx, cy, r, clockDeg) {
    var rad = ((clockDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function buildWedgePath(startDeg, endDeg) {
    var span = endDeg - startDeg;
    if (span <= 0.05) return '';
    // SVG arcs collapse when start and end points coincide at 360 degrees.
    var clampedEnd = span >= 359.95 ? startDeg + 359.95 : endDeg;
    var start = polarToCartesian(PIE_CX, PIE_CY, PIE_R, startDeg);
    var end = polarToCartesian(PIE_CX, PIE_CY, PIE_R, clampedEnd);
    var largeArc = clampedEnd - startDeg > 180 ? 1 : 0;
    return 'M' + PIE_CX + ' ' + PIE_CY +
      ' L' + start.x.toFixed(2) + ' ' + start.y.toFixed(2) +
      ' A' + PIE_R + ' ' + PIE_R + ' 0 ' + largeArc + ' 1 ' + end.x.toFixed(2) + ' ' + end.y.toFixed(2) + ' Z';
  }

  function initProtractorTicks() {
    if (!pieTicksGroup || pieTicksGroup.childElementCount > 0) return;
    var ns = 'http://www.w3.org/2000/svg';
    for (var deg = 0; deg < 360; deg += 30) {
      var isMajor = deg % 90 === 0;
      var innerR = isMajor ? 166 : 172;
      var outerR = 182;
      var p1 = polarToCartesian(PIE_CX, PIE_CY, innerR, deg);
      var p2 = polarToCartesian(PIE_CX, PIE_CY, outerR, deg);
      var line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', p1.x.toFixed(2));
      line.setAttribute('y1', p1.y.toFixed(2));
      line.setAttribute('x2', p2.x.toFixed(2));
      line.setAttribute('y2', p2.y.toFixed(2));
      if (isMajor) line.setAttribute('stroke-width', '2.4');
      pieTicksGroup.appendChild(line);
    }
  }

  function renderPieAt(progress) {
    var currentDeg = progress * 360;
    for (var i = 0; i < SLICES.length; i++) {
      var slice = SLICES[i];
      var pathEl = document.querySelector('.pie-slice-path[data-slice="' + slice.id + '"]');
      var labelEl = document.querySelector('.pie-slice-label[data-label="' + slice.id + '"]');
      var pctEl = document.querySelector('.legend-pct[data-pct="' + slice.id + '"]');
      var span = slice.endDeg - slice.startDeg;
      var drawn = Math.max(0, Math.min(span, currentDeg - slice.startDeg));
      var ratio = drawn / span;

      if (pathEl) {
        pathEl.setAttribute('d', drawn > 0.05 ? buildWedgePath(slice.startDeg, slice.startDeg + drawn) : '');
      }
      if (labelEl) {
        var labelOpacity = ratio >= 0.72 ? Math.min(1, (ratio - 0.72) / 0.28) : 0;
        labelEl.style.opacity = labelOpacity.toFixed(2);
      }
      if (pctEl) {
        pctEl.textContent = (slice.pct * ratio).toFixed(1) + '%';
      }
      if (loupeClone) {
        var clonePath = loupeClone.querySelector('.pie-slice-path[data-slice="' + slice.id + '"]');
        var cloneLabel = loupeClone.querySelector('.pie-slice-label[data-label="' + slice.id + '"]');
        var clonePct = loupeClone.querySelector('.legend-pct[data-pct="' + slice.id + '"]');
        if (clonePath && pathEl) clonePath.setAttribute('d', pathEl.getAttribute('d') || '');
        if (cloneLabel && labelEl) cloneLabel.style.opacity = labelEl.style.opacity;
        if (clonePct && pctEl) clonePct.textContent = pctEl.textContent;
      }
    }
  }

  function stopPieAnimation() {
    if (pieRafId !== null) {
      cancelAnimationFrame(pieRafId);
      pieRafId = null;
    }
    if (pieFallbackTimer !== null) {
      clearTimeout(pieFallbackTimer);
      pieFallbackTimer = null;
    }
  }

  function playPieAnimation() {
    stopPieAnimation();
    var startTs = nowMs();
    renderPieAt(0);

    function step() {
      if (currentSlide !== 2 || document.hidden) {
        stopPieAnimation();
        renderPieAt(1);
        if (isLoupeActive) syncLoupeClone();
        return;
      }
      var elapsed = Math.max(0, nowMs() - startTs);
      var t = Math.min(1, elapsed / SWEEP_MS);
      renderPieAt(easeOutQuart(t));
      if (t < 1) {
        pieRafId = requestAnimationFrame(step);
      } else {
        stopPieAnimation();
        renderPieAt(1);
        if (isLoupeActive) syncLoupeClone();
      }
    }

    pieRafId = requestAnimationFrame(step);
    pieFallbackTimer = setTimeout(function () {
      stopPieAnimation();
      renderPieAt(1);
      if (isLoupeActive) syncLoupeClone();
    }, SWEEP_MS + 250);
  }

  function findSliceById(id) {
    for (var i = 0; i < SLICES.length; i++) {
      if (SLICES[i].id === id) return SLICES[i];
    }
    return null;
  }

  function selectSlice(sliceId) {
    activeSliceId = activeSliceId === sliceId ? null : sliceId;
    var selected = findSliceById(activeSliceId);

    for (var i = 0; i < sliceGroups.length; i++) {
      var group = sliceGroups[i];
      var id = group.getAttribute('data-slice');
      var slice = findSliceById(id);
      var isSelected = Boolean(selected && selected.id === id);
      group.setAttribute('aria-pressed', String(isSelected));
      group.classList.toggle('is-dimmed', Boolean(selected && !isSelected));
      if (isSelected && slice) {
        var midDeg = (slice.startDeg + slice.endDeg) / 2;
        var rad = ((midDeg - 90) * Math.PI) / 180;
        var dx = (Math.cos(rad) * 10).toFixed(2);
        var dy = (Math.sin(rad) * 10).toFixed(2);
        group.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      } else {
        group.style.transform = '';
      }
    }

    for (var j = 0; j < legendCards.length; j++) {
      var card = legendCards[j];
      var cardSelected = Boolean(selected && card.getAttribute('data-select') === selected.id);
      card.classList.toggle('is-selected', cardSelected);
      card.setAttribute('aria-pressed', String(cardSelected));
    }

    if (pieAllBtn) {
      pieAllBtn.setAttribute('aria-pressed', String(!selected));
    }

    var info = selected || SUMMARY_DETAIL;
    if (inspectorTitle) inspectorTitle.textContent = info.title;
    if (inspectorFormula) inspectorFormula.textContent = info.formula;
    if (inspectorText) inspectorText.textContent = info.detail;
    if (isLoupeActive) syncLoupeClone();
  }

  function fitStage() {
    var baseWidth = Math.max(1, stage.clientWidth);
    stage.style.setProperty('--deck-scale', String(baseWidth / 1440));
    if (!supportsAspectRatio) {
      stage.style.height = mobile.matches ? 'auto' : Math.round((baseWidth * 9) / 16) + 'px';
    }
    if (isLoupeActive && loupeX !== null && loupeY !== null) {
      positionLoupe(loupeX, loupeY);
    }
  }

  var zoomUse = zoomButton ? zoomButton.querySelector('use') : null;

  function syncLoupeClone() {
    if (!magnifierContent || !slides[currentSlide]) return;
    var sourceSlide = slides[currentSlide];
    var clone = sourceSlide.cloneNode(true);
    clone.removeAttribute('id');
    var withIds = clone.querySelectorAll('[id]');
    for (var i = 0; i < withIds.length; i++) {
      withIds[i].removeAttribute('id');
    }
    clone.classList.remove('entering');
    clone.setAttribute('aria-hidden', 'true');
    clone.tabIndex = -1;

    if (mobile.matches) {
      clone.style.width = sourceSlide.offsetWidth + 'px';
      clone.style.height = sourceSlide.offsetHeight + 'px';
    }

    clearChildren(magnifierContent);
    magnifierContent.appendChild(clone);
    loupeClone = clone;
    if (loupeX !== null && loupeY !== null) {
      positionLoupe(loupeX, loupeY);
    }
  }

  function positionLoupe(x, y) {
    if (!magnifierLens || !loupeClone) return;
    var lensRadius = (magnifierLens.offsetWidth || 236) / 2;
    var stageW = stage.clientWidth || 1;
    var stageH = stage.clientHeight || 1;
    var cx = Math.max(0, Math.min(stageW, x));
    var cy = Math.max(0, Math.min(stageH, y));
    loupeX = cx;
    loupeY = cy;

    var baseScale = mobile.matches ? 1 : stageW / 1440;
    var loupeScale = baseScale * LOUPE_MAG;
    var tx = lensRadius - cx * LOUPE_MAG;
    var ty = lensRadius - cy * LOUPE_MAG;

    magnifierLens.style.transform = 'translate3d(' + (cx - lensRadius).toFixed(1) + 'px, ' + (cy - lensRadius).toFixed(1) + 'px, 0)';
    loupeClone.style.transform = 'translate3d(' + tx.toFixed(1) + 'px, ' + ty.toFixed(1) + 'px, 0) scale(' + loupeScale.toFixed(4) + ')';
  }

  function setLoupe(nextState) {
    isLoupeActive = Boolean(nextState);
    stage.classList.toggle('is-loupe', isLoupeActive);
    if (zoomButton) {
      var label = isLoupeActive ? 'カーソル拡大鏡をオフにする' : 'カーソル拡大鏡を有効にする';
      zoomButton.setAttribute('aria-pressed', String(isLoupeActive));
      zoomButton.setAttribute('aria-label', label);
      zoomButton.title = (isLoupeActive ? 'カーソル拡大鏡オフ' : 'カーソル拡大鏡') + ' (Z)';
      setUseHref(zoomUse, isLoupeActive ? '#icon-zoom-out' : '#icon-zoom-in');
    }

    if (!magnifierLens) return;
    if (isLoupeActive) {
      magnifierLens.hidden = false;
      loupeX = (stage.clientWidth || 600) / 2;
      loupeY = mobile.matches
        ? Math.min((stage.clientHeight || 340) / 2, 220)
        : (stage.clientHeight || 340) / 2;
      syncLoupeClone();
      announcer.textContent = 'カーソル拡大鏡を有効にしました。カーソルを動かすと拡大できます。';
    } else {
      magnifierLens.hidden = true;
      clearChildren(magnifierContent);
      loupeClone = null;
      announcer.textContent = 'カーソル拡大鏡を終了しました。';
    }
  }

  function readHash() {
    var match = location.hash.match(/^#slide-(\d+)$/);
    if (!match) return 0;
    var index = Number(match[1]) - 1;
    return index >= 0 && index < slides.length ? index : 0;
  }

  function goToSlide(index, options) {
    var opts = options || {};
    var updateHash = opts.updateHash !== undefined ? opts.updateHash : true;
    var focus = Boolean(opts.focus);
    var animate = opts.animate !== undefined ? opts.animate : true;

    if (typeof index !== 'number' || isNaN(index) || index < 0 || index >= slides.length) return;
    var changed = currentSlide !== index;
    var focusIsInSlide = false;
    for (var k = 0; k < slides.length; k++) {
      if (slides[k].contains(document.activeElement)) {
        focusIsInSlide = true;
        break;
      }
    }
    currentSlide = index;
    clearTimeout(transitionTimer);

    for (var i = 0; i < slides.length; i++) {
      var slide = slides[i];
      var active = i === index;
      slide.hidden = !active;
      slide.inert = !active;
      slide.classList.toggle('active', active);
      slide.classList.remove('entering');
    }

    if (changed && animate) {
      slides[index].classList.add('entering');
      transitionTimer = setTimeout(function () {
        slides[index].classList.remove('entering');
      }, 380);
    }

    for (var b = 0; b < slideButtons.length; b++) {
      var button = slideButtons[b];
      button.classList.toggle('current', b === index);
      if (b === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    }

    previousButton.disabled = index === 0;
    nextButton.disabled = index === slides.length - 1;
    document.querySelector('.skip-link').href = '#slide-' + (index + 1);
    if (mobileSlideLabel) {
      mobileSlideLabel.textContent = 'スライド ' + (index + 1) + ' / ' + slides.length + ' · ' + slides[index].getAttribute('data-title');
    }
    closeMobileNav();

    if (updateHash && location.hash !== '#slide-' + (index + 1)) {
      try {
        history.replaceState(null, '', '#slide-' + (index + 1));
      } catch (err) {
        location.hash = 'slide-' + (index + 1);
      }
    }

    if (index === 2) {
      playPieAnimation();
    } else {
      stopPieAnimation();
    }

    if (focus || focusIsInSlide) {
      try {
        slides[index].focus({ preventScroll: true });
      } catch (err) {
        slides[index].focus();
      }
    }
    if (isLoupeActive) {
      syncLoupeClone();
      if (magnifierLens && loupeX !== null && loupeY !== null) {
        magnifierLens.hidden = false;
      }
    }
    if (changed && mobile.matches) {
      window.scrollTo(0, 0);
    }
    announcer.textContent = 'スライド ' + (index + 1) + ' / ' + slides.length + '：' + slides[index].getAttribute('data-title');
  }

  function closeMobileNav(options) {
    var restoreFocus = options && options.restoreFocus;
    if (!slideNav || !mobileSlideTrigger) return;
    var wasOpen = slideNav.classList.contains('is-open');
    slideNav.classList.remove('is-open');
    mobileSlideTrigger.setAttribute('aria-expanded', 'false');
    if (wasOpen && restoreFocus) {
      try {
        mobileSlideTrigger.focus({ preventScroll: true });
      } catch (err) {
        mobileSlideTrigger.focus();
      }
    }
  }

  function toggleMobileNav() {
    if (!slideNav || !mobileSlideTrigger) return;
    var isOpen = slideNav.classList.toggle('is-open');
    mobileSlideTrigger.setAttribute('aria-expanded', String(isOpen));
  }

  function toggleFurigana() {
    var hidden = document.body.classList.toggle('furigana-hidden');
    var active = !hidden;
    furiganaToggle.setAttribute('aria-pressed', String(active));
    furiganaState.textContent = active ? '表示' : '非表示';
    if (isLoupeActive) syncLoupeClone();
    announcer.textContent = active ? 'ふりがなを表示しました。' : 'ふりがなを非表示にしました。';
  }

  function toast(message) {
    var element = document.querySelector('#toast');
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    toastTimer = setTimeout(function () {
      element.hidden = true;
    }, 4000);
  }

  var fullscreenUse = fullscreenButton ? fullscreenButton.querySelector('use') : null;

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || null;
  }

  function toggleFullscreen() {
    var docEl = document.documentElement;
    var req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
    var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    try {
      if (getFullscreenElement()) {
        if (exit) exit.call(document);
      } else if (req) {
        req.call(docEl);
      } else {
        toast('このブラウザは全画面表示に対応していません。');
      }
    } catch (err) {
      toast('このウィンドウでは全画面表示を利用できません。');
    }
  }

  var goButtons = Array.prototype.slice.call(document.querySelectorAll('[data-go]'));
  for (var g = 0; g < goButtons.length; g++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        goToSlide(Number(btn.getAttribute('data-go')), { focus: true });
      });
    })(goButtons[g]);
  }

  document.querySelector('.brand').addEventListener('click', function (event) {
    event.preventDefault();
    goToSlide(0, { focus: true });
  });

  previousButton.addEventListener('click', function () {
    goToSlide(currentSlide - 1, { focus: true });
  });
  nextButton.addEventListener('click', function () {
    goToSlide(currentSlide + 1, { focus: true });
  });
  furiganaToggle.addEventListener('click', toggleFurigana);
  if (zoomButton) {
    zoomButton.addEventListener('click', function () {
      setLoupe(!isLoupeActive);
    });
  }
  fullscreenButton.addEventListener('click', toggleFullscreen);

  if (mobileSlideTrigger) {
    mobileSlideTrigger.addEventListener('click', toggleMobileNav);
  }

  document.addEventListener('click', function (event) {
    if (slideNav && slideNav.classList.contains('is-open') && !closestEl(event.target, '#slide-nav-list, #mobile-slide-trigger')) {
      closeMobileNav();
    }
  });

  if (pieReplayBtn) {
    pieReplayBtn.addEventListener('click', function () {
      if (activeSliceId) selectSlice(activeSliceId);
      playPieAnimation();
    });
  }

  if (pieAllBtn) {
    pieAllBtn.addEventListener('click', function () {
      if (activeSliceId) selectSlice(activeSliceId);
    });
  }

  for (var s = 0; s < sliceGroups.length; s++) {
    (function (group) {
      var id = group.getAttribute('data-slice');
      group.addEventListener('click', function () {
        selectSlice(id);
      });
      group.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectSlice(id);
        }
      });
    })(sliceGroups[s]);
  }

  for (var l = 0; l < legendCards.length; l++) {
    (function (card) {
      card.addEventListener('click', function () {
        selectSlice(card.getAttribute('data-select'));
      });
    })(legendCards[l]);
  }

  window.addEventListener('hashchange', function () {
    goToSlide(readHash(), { updateHash: false });
  });
  window.addEventListener('resize', fitStage);
  if (typeof window.ResizeObserver === 'function') {
    new window.ResizeObserver(fitStage).observe(stage);
  }

  function onFullscreenChange() {
    var active = Boolean(getFullscreenElement());
    var label = active ? '全画面表示を終了' : '全画面表示にする';
    fullscreenButton.setAttribute('aria-label', label);
    fullscreenButton.title = label + ' (F)';
    setUseHref(fullscreenUse, active ? '#collapse' : '#expand');
    fitStage();
    requestAnimationFrame(fitStage);
  }

  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);

  document.addEventListener('keydown', function (event) {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    var key = event.key || '';
    if (key === 'Escape' && slideNav && slideNav.classList.contains('is-open')) {
      event.preventDefault();
      closeMobileNav({ restoreFocus: true });
      return;
    }
    if (key === 'Escape' && isLoupeActive) {
      event.preventDefault();
      setLoupe(false);
      return;
    }
    if (closestEl(event.target, 'input, textarea, select, [contenteditable="true"]')) return;

    if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'PageDown') {
      event.preventDefault();
      goToSlide(currentSlide + 1, { focus: true });
    } else if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') {
      event.preventDefault();
      goToSlide(currentSlide - 1, { focus: true });
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault();
      goToSlide(key === 'Home' ? 0 : slides.length - 1, { focus: true });
    } else if (key.toLowerCase() === 'z') {
      event.preventDefault();
      setLoupe(!isLoupeActive);
    } else if (key.toLowerCase() === 'f') {
      event.preventDefault();
      toggleFullscreen();
    } else if (key === ' ' && !closestEl(event.target, 'button, a, summary, [role="button"]')) {
      event.preventDefault();
      goToSlide(event.shiftKey ? currentSlide - 1 : currentSlide + 1, { focus: true });
    }
  });

  function updateLoupeFromClientXY(clientX, clientY) {
    if (!isLoupeActive || !magnifierLens) return;
    var rect = stage.getBoundingClientRect();
    var x = clientX - rect.left - (stage.clientLeft || 0);
    var y = clientY - rect.top - (stage.clientTop || 0);
    magnifierLens.hidden = false;
    positionLoupe(x, y);
  }

  stage.addEventListener('mousemove', function (event) {
    updateLoupeFromClientXY(event.clientX, event.clientY);
  });
  stage.addEventListener('mouseenter', function (event) {
    updateLoupeFromClientXY(event.clientX, event.clientY);
  });
  stage.addEventListener('mouseleave', function () {
    if (!isLoupeActive || !magnifierLens) return;
    magnifierLens.hidden = true;
  });

  var touchStart = null;
  stage.addEventListener('touchstart', function (event) {
    if (isLoupeActive && event.touches.length === 1) {
      updateLoupeFromClientXY(event.touches[0].clientX, event.touches[0].clientY);
      touchStart = null;
      return;
    }
    if (event.touches.length !== 1 || closestEl(event.target, 'button, input, textarea, a, [role="button"]')) {
      touchStart = null;
      return;
    }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });

  stage.addEventListener('touchmove', function (event) {
    if (isLoupeActive && event.touches.length === 1) {
      updateLoupeFromClientXY(event.touches[0].clientX, event.touches[0].clientY);
    }
  }, { passive: true });

  stage.addEventListener('touchend', function (event) {
    if (!touchStart || event.changedTouches.length !== 1) return;
    var deltaX = event.changedTouches[0].clientX - touchStart.x;
    var deltaY = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(deltaX) > 75 && Math.abs(deltaX) > Math.abs(deltaY) * 1.8) {
      if (deltaX < 0) goToSlide(currentSlide + 1, { focus: true });
      else goToSlide(currentSlide - 1, { focus: true });
    }
    touchStart = null;
  }, { passive: true });

  stage.addEventListener('touchcancel', function () {
    touchStart = null;
  }, { passive: true });

  window.addEventListener('beforeprint', function () {
    stopPieAnimation();
    for (var i = 0; i < slides.length; i++) {
      slides[i].inert = false;
    }
    renderPieAt(1);
  });

  window.addEventListener('afterprint', function () {
    for (var i = 0; i < slides.length; i++) {
      slides[i].inert = i !== currentSlide;
    }
  });

  initProtractorTicks();
  renderPieAt(1);
  fitStage();
  goToSlide(readHash(), { updateHash: Boolean(location.hash), animate: false });
})();
