(() => {
  'use strict';

  const slides = [...document.querySelectorAll('.slide')];
  const stage = document.querySelector('.stage');
  const slideButtons = [...document.querySelectorAll('.slide-nav [data-go]')];
  const previousButton = document.querySelector('.previous');
  const nextButton = document.querySelector('.next');
  const announcer = document.querySelector('#slide-announcer');
  const zoomButton = document.querySelector('#zoom-button');
  const fullscreenButton = document.querySelector('#fullscreen-button');
  const furiganaToggle = document.querySelector('#furigana-toggle');
  const furiganaState = document.querySelector('#furigana-state');
  const mobileSlideTrigger = document.querySelector('#mobile-slide-trigger');
  const mobileSlideLabel = document.querySelector('#mobile-slide-label');
  const slideNav = document.querySelector('#slide-nav-list');
  const mobile = window.matchMedia('(max-width: 900px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const pieTicksGroup = document.querySelector('#pie-ticks');
  const pieReplayBtn = document.querySelector('#pie-replay-btn');
  const pieAllBtn = document.querySelector('#pie-all-btn');
  const sliceGroups = [...document.querySelectorAll('.pie-slice-group')];
  const legendCards = [...document.querySelectorAll('.legend-card')];
  const inspectorTitle = document.querySelector('#inspector-title');
  const inspectorFormula = document.querySelector('#inspector-formula');
  const inspectorText = document.querySelector('#inspector-text');

  const PIE_CX = 210;
  const PIE_CY = 210;
  const PIE_R = 148;
  const SWEEP_MS = 1150;

  const SLICES = [
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

  const SUMMARY_DETAIL = {
    title: '全体のまとめ（6名）',
    formula: '4/6 + 1/6 + 1/6 = 1',
    detail: '最も割合が高いのはSNSで4名（66.6%）を占める。次にゲームが1名（16.7%）、日本語辞典の利用も同じく1名で16.7%を占めている。'
  };

  const ZOOM_FACTOR = 1.55;

  let currentSlide = 0;
  let transitionTimer;
  let toastTimer;
  let pieRafId = null;
  let activeSliceId = null;
  let isZoomed = false;

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function polarToCartesian(cx, cy, r, clockDeg) {
    const rad = ((clockDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function buildWedgePath(startDeg, endDeg) {
    const span = endDeg - startDeg;
    if (span <= 0.05) return '';
    // SVG arcs collapse when start and end points coincide at 360 degrees.
    const clampedEnd = span >= 359.95 ? startDeg + 359.95 : endDeg;
    const start = polarToCartesian(PIE_CX, PIE_CY, PIE_R, startDeg);
    const end = polarToCartesian(PIE_CX, PIE_CY, PIE_R, clampedEnd);
    const largeArc = clampedEnd - startDeg > 180 ? 1 : 0;
    return `M${PIE_CX} ${PIE_CY} L${start.x.toFixed(2)} ${start.y.toFixed(2)} A${PIE_R} ${PIE_R} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
  }

  function initProtractorTicks() {
    if (!pieTicksGroup || pieTicksGroup.childElementCount > 0) return;
    const ns = 'http://www.w3.org/2000/svg';
    for (let deg = 0; deg < 360; deg += 30) {
      const isMajor = deg % 90 === 0;
      const innerR = isMajor ? 166 : 172;
      const outerR = 182;
      const p1 = polarToCartesian(PIE_CX, PIE_CY, innerR, deg);
      const p2 = polarToCartesian(PIE_CX, PIE_CY, outerR, deg);
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', p1.x.toFixed(2));
      line.setAttribute('y1', p1.y.toFixed(2));
      line.setAttribute('x2', p2.x.toFixed(2));
      line.setAttribute('y2', p2.y.toFixed(2));
      if (isMajor) line.setAttribute('stroke-width', '2.4');
      pieTicksGroup.appendChild(line);
    }
  }

  function renderPieAt(progress) {
    const currentDeg = progress * 360;
    SLICES.forEach(slice => {
      const pathEl = document.querySelector(`.pie-slice-path[data-slice="${slice.id}"]`);
      const labelEl = document.querySelector(`.pie-slice-label[data-label="${slice.id}"]`);
      const pctEl = document.querySelector(`.legend-pct[data-pct="${slice.id}"]`);
      const span = slice.endDeg - slice.startDeg;
      const drawn = Math.max(0, Math.min(span, currentDeg - slice.startDeg));
      const ratio = drawn / span;

      if (pathEl) {
        pathEl.setAttribute('d', drawn > 0.05 ? buildWedgePath(slice.startDeg, slice.startDeg + drawn) : '');
      }
      if (labelEl) {
        const labelOpacity = ratio >= 0.72 ? Math.min(1, (ratio - 0.72) / 0.28) : 0;
        labelEl.style.opacity = labelOpacity.toFixed(2);
      }
      if (pctEl) {
        pctEl.textContent = (slice.pct * ratio).toFixed(1) + '%';
      }
    });
  }

  function stopPieAnimation() {
    if (pieRafId !== null) {
      cancelAnimationFrame(pieRafId);
      pieRafId = null;
    }
  }

  function playPieAnimation() {
    stopPieAnimation();
    if (reducedMotion.matches) {
      renderPieAt(1);
      return;
    }
    const startTs = performance.now();
    renderPieAt(0);

    function step(now) {
      if (currentSlide !== 2 || document.hidden) {
        stopPieAnimation();
        renderPieAt(1);
        return;
      }
      const t = Math.min(1, (now - startTs) / SWEEP_MS);
      renderPieAt(easeOutQuart(t));
      if (t < 1) {
        pieRafId = requestAnimationFrame(step);
      } else {
        pieRafId = null;
      }
    }

    pieRafId = requestAnimationFrame(step);
  }

  function selectSlice(sliceId) {
    activeSliceId = activeSliceId === sliceId ? null : sliceId;
    const selected = SLICES.find(s => s.id === activeSliceId) || null;

    sliceGroups.forEach(group => {
      const id = group.dataset.slice;
      const slice = SLICES.find(s => s.id === id);
      const isSelected = Boolean(selected && selected.id === id);
      group.setAttribute('aria-pressed', String(isSelected));
      group.classList.toggle('is-dimmed', Boolean(selected && !isSelected));
      if (isSelected && slice) {
        const midDeg = (slice.startDeg + slice.endDeg) / 2;
        const rad = ((midDeg - 90) * Math.PI) / 180;
        const dx = (Math.cos(rad) * 10).toFixed(2);
        const dy = (Math.sin(rad) * 10).toFixed(2);
        group.style.transform = `translate(${dx}px, ${dy}px)`;
      } else {
        group.style.transform = '';
      }
    });

    legendCards.forEach(card => {
      const isSelected = Boolean(selected && card.dataset.select === selected.id);
      card.classList.toggle('is-selected', isSelected);
      card.setAttribute('aria-pressed', String(isSelected));
    });

    if (pieAllBtn) {
      pieAllBtn.setAttribute('aria-pressed', String(!selected));
    }

    const info = selected || SUMMARY_DETAIL;
    if (inspectorTitle) inspectorTitle.textContent = info.title;
    if (inspectorFormula) inspectorFormula.textContent = info.formula;
    if (inspectorText) inspectorText.textContent = info.detail;
  }

  function fitStage() {
    const baseWidth = Math.max(1, stage.getBoundingClientRect().width - 6);
    const scale = (baseWidth / 1440) * (isZoomed ? ZOOM_FACTOR : 1);
    stage.style.setProperty('--deck-scale', scale);
  }

  const zoomUse = zoomButton?.querySelector('use');

  function setZoom(nextState) {
    isZoomed = Boolean(nextState);
    stage.classList.toggle('is-zoomed', isZoomed);
    if (zoomButton) {
      const label = isZoomed ? '拡大表示を解除' : 'スライドを拡大表示にする';
      zoomButton.setAttribute('aria-pressed', String(isZoomed));
      zoomButton.setAttribute('aria-label', label);
      zoomButton.title = (isZoomed ? '元のサイズに戻す' : '拡大表示') + ' (Z)';
      if (zoomUse) zoomUse.setAttribute('href', isZoomed ? '#icon-zoom-out' : '#icon-zoom-in');
    }
    fitStage();
    stage.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    announcer.textContent = isZoomed ? 'スライドを拡大表示にしました。' : 'スライドを通常表示に戻しました。';
  }

  function readHash() {
    const match = location.hash.match(/^#slide-(\d+)$/);
    if (!match) return 0;
    const index = Number(match[1]) - 1;
    return index >= 0 && index < slides.length ? index : 0;
  }

  function goToSlide(index, { updateHash = true, focus = false, animate = true } = {}) {
    if (!Number.isInteger(index) || index < 0 || index >= slides.length) return;
    const changed = currentSlide !== index;
    const focusIsInSlide = slides.some(slide => slide.contains(document.activeElement));
    currentSlide = index;
    clearTimeout(transitionTimer);

    slides.forEach((slide, i) => {
      const active = i === index;
      slide.hidden = !active;
      slide.inert = !active;
      slide.classList.toggle('active', active);
      slide.classList.remove('entering');
    });

    if (changed && animate) {
      slides[index].classList.add('entering');
      transitionTimer = setTimeout(() => slides[index].classList.remove('entering'), 380);
    }

    slideButtons.forEach((button, i) => {
      button.classList.toggle('current', i === index);
      if (i === index) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });

    previousButton.disabled = index === 0;
    nextButton.disabled = index === slides.length - 1;
    document.querySelector('.skip-link').href = '#slide-' + (index + 1);
    if (mobileSlideLabel) {
      mobileSlideLabel.textContent = 'スライド ' + (index + 1) + ' / ' + slides.length + ' · ' + slides[index].dataset.title;
    }
    closeMobileNav();

    if (updateHash && location.hash !== '#slide-' + (index + 1)) {
      try {
        history.replaceState(null, '', '#slide-' + (index + 1));
      } catch {
        location.hash = 'slide-' + (index + 1);
      }
    }

    if (index === 2) {
      playPieAnimation();
    } else {
      stopPieAnimation();
    }

    if (focus || focusIsInSlide) slides[index].focus({ preventScroll: true });
    if (isZoomed) stage.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (changed && mobile.matches) window.scrollTo({ top: 0, behavior: 'instant' });
    announcer.textContent = 'スライド ' + (index + 1) + ' / ' + slides.length + '：' + slides[index].dataset.title;
  }

  function closeMobileNav({ restoreFocus = false } = {}) {
    if (!slideNav || !mobileSlideTrigger) return;
    const wasOpen = slideNav.classList.contains('is-open');
    slideNav.classList.remove('is-open');
    mobileSlideTrigger.setAttribute('aria-expanded', 'false');
    if (wasOpen && restoreFocus) mobileSlideTrigger.focus({ preventScroll: true });
  }

  function toggleMobileNav() {
    if (!slideNav || !mobileSlideTrigger) return;
    const isOpen = slideNav.classList.toggle('is-open');
    mobileSlideTrigger.setAttribute('aria-expanded', String(isOpen));
  }

  function toggleFurigana() {
    const hidden = document.body.classList.toggle('furigana-hidden');
    const active = !hidden;
    furiganaToggle.setAttribute('aria-pressed', String(active));
    furiganaState.textContent = active ? '表示' : '非表示';
    announcer.textContent = active ? 'ふりがなを表示しました。' : 'ふりがなを非表示にしました。';
  }

  function toast(message) {
    const element = document.querySelector('#toast');
    clearTimeout(toastTimer);
    element.textContent = message;
    element.hidden = false;
    toastTimer = setTimeout(() => {
      element.hidden = true;
    }, 4000);
  }

  const fullscreenUse = fullscreenButton.querySelector('use');

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('このブラウザは全画面表示に対応していません。');
    } catch {
      toast('このウィンドウでは全画面表示を利用できません。');
    }
  }

  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => goToSlide(Number(button.dataset.go), { focus: true }));
  });

  document.querySelector('.brand').addEventListener('click', event => {
    event.preventDefault();
    goToSlide(0, { focus: true });
  });

  previousButton.addEventListener('click', () => goToSlide(currentSlide - 1, { focus: true }));
  nextButton.addEventListener('click', () => goToSlide(currentSlide + 1, { focus: true }));
  furiganaToggle.addEventListener('click', toggleFurigana);
  if (zoomButton) {
    zoomButton.addEventListener('click', () => setZoom(!isZoomed));
  }
  fullscreenButton.addEventListener('click', toggleFullscreen);

  if (mobileSlideTrigger) {
    mobileSlideTrigger.addEventListener('click', toggleMobileNav);
  }

  document.addEventListener('click', event => {
    if (slideNav?.classList.contains('is-open') && !event.target.closest('#slide-nav-list, #mobile-slide-trigger')) {
      closeMobileNav();
    }
  });

  if (pieReplayBtn) {
    pieReplayBtn.addEventListener('click', () => {
      if (activeSliceId) selectSlice(activeSliceId);
      playPieAnimation();
    });
  }

  if (pieAllBtn) {
    pieAllBtn.addEventListener('click', () => {
      if (activeSliceId) selectSlice(activeSliceId);
    });
  }

  sliceGroups.forEach(group => {
    const id = group.dataset.slice;
    group.addEventListener('click', () => selectSlice(id));
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectSlice(id);
      }
    });
  });

  legendCards.forEach(card => {
    card.addEventListener('click', () => selectSlice(card.dataset.select));
  });

  window.addEventListener('hashchange', () => goToSlide(readHash(), { updateHash: false }));
  new ResizeObserver(fitStage).observe(stage);

  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    const label = active ? '全画面表示を終了' : '全画面表示にする';
    fullscreenButton.setAttribute('aria-label', label);
    fullscreenButton.title = label + ' (F)';
    if (fullscreenUse) fullscreenUse.setAttribute('href', active ? '#collapse' : '#expand');
    fitStage();
    requestAnimationFrame(fitStage);
  });

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'Escape' && slideNav?.classList.contains('is-open')) {
      event.preventDefault();
      closeMobileNav({ restoreFocus: true });
      return;
    }
    if (event.key === 'Escape' && isZoomed) {
      event.preventDefault();
      setZoom(false);
      return;
    }
    const target = event.target;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;

    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key)) {
      if (isZoomed && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) return;
      event.preventDefault();
      goToSlide(currentSlide + 1, { focus: true });
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
      if (isZoomed && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) return;
      event.preventDefault();
      goToSlide(currentSlide - 1, { focus: true });
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      goToSlide(event.key === 'Home' ? 0 : slides.length - 1, { focus: true });
    } else if (event.key.toLowerCase() === 'z') {
      event.preventDefault();
      setZoom(!isZoomed);
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault();
      toggleFullscreen();
    } else if (event.key === ' ' && !target.closest('button, a, summary, [role="button"]')) {
      event.preventDefault();
      goToSlide(event.shiftKey ? currentSlide - 1 : currentSlide + 1, { focus: true });
    }
  });

  let panStart = null;
  stage.addEventListener('pointerdown', event => {
    if (!isZoomed || event.pointerType !== 'mouse' || event.button !== 0) return;
    if (event.target.closest('button, a, input, textarea, select, [role="button"]')) return;
    panStart = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: stage.scrollLeft,
      scrollTop: stage.scrollTop
    };
    stage.classList.add('is-panning');
  });

  window.addEventListener('pointermove', event => {
    if (!panStart) return;
    stage.scrollLeft = panStart.scrollLeft - (event.clientX - panStart.x);
    stage.scrollTop = panStart.scrollTop - (event.clientY - panStart.y);
  });

  function stopPan() {
    if (!panStart) return;
    panStart = null;
    stage.classList.remove('is-panning');
  }

  window.addEventListener('pointerup', stopPan);
  window.addEventListener('pointercancel', stopPan);

  let touchStart = null;
  stage.addEventListener('touchstart', event => {
    if (isZoomed || event.touches.length !== 1 || event.target.closest('button, input, textarea, a, [role="button"]')) {
      touchStart = null;
      return;
    }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });

  stage.addEventListener('touchend', event => {
    if (!touchStart || event.changedTouches.length !== 1) return;
    const deltaX = event.changedTouches[0].clientX - touchStart.x;
    const deltaY = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(deltaX) > 75 && Math.abs(deltaX) > Math.abs(deltaY) * 1.8) {
      if (deltaX < 0) goToSlide(currentSlide + 1, { focus: true });
      else goToSlide(currentSlide - 1, { focus: true });
    }
    touchStart = null;
  }, { passive: true });

  stage.addEventListener('touchcancel', () => {
    touchStart = null;
  }, { passive: true });

  window.addEventListener('beforeprint', () => {
    stopPieAnimation();
    slides.forEach(slide => {
      slide.inert = false;
    });
    renderPieAt(1);
  });

  window.addEventListener('afterprint', () => {
    slides.forEach((slide, index) => {
      slide.inert = index !== currentSlide;
    });
  });

  initProtractorTicks();
  renderPieAt(1);
  fitStage();
  goToSlide(readHash(), { updateHash: Boolean(location.hash), animate: false });
})();
