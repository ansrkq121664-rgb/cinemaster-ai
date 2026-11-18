/* CineMaster AI 홈페이지 동작 (규칙: docs/site_design.md)
 *  1) 첫 화면 와이프 비교: 끌기 · 클릭 · 방향키 (움직임 줄이기 설정이면 처음 들어오는 움직임 없음)
 *  2) 룩 바꿔 끼우기: 오른쪽 그레이딩 이미지를 다른 룩의 실제 렌더로 바꾼다
 *  3) 작업 순서 탭: 앱의 실제 다섯 페이지 캡처 (←/→ · Home/End)
 *  4) 설치 파일 · 포터블 버튼: 링크가 비었거나 같은 사이트 파일이 아직 없으면 "준비 중" 안내
 *  5) SHA-256 복사, 6) 웹 버전을 이 페이지 안에서 열기
 */
(function () {
  "use strict";
  var site = window.CINEMASTER_SITE || {};
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ── 안내 메시지 ──
  var toastEl = $(".toast"), toastTimer = 0;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 6000);
  }

  // ── 1) 와이프 ──
  var wrap = $(".wipe-wrap"), frame = $("[data-wipe]"), handle = frame && $(".handle", frame);
  var pos = 50, dragging = false;
  function setWipe(p) {
    pos = Math.max(0, Math.min(100, p));
    wrap.style.setProperty("--wipe", pos + "%");
    handle.setAttribute("aria-valuenow", String(Math.round(pos)));
    handle.setAttribute("aria-valuetext", "왼쪽 Log 원본 " + Math.round(pos) + "%");
  }
  if (frame && handle) {
    var fromEvent = function (e) { var r = frame.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
    frame.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      try { frame.setPointerCapture(e.pointerId); } catch (_) {}
      setWipe(fromEvent(e));
      handle.focus({ preventScroll: true });
    });
    frame.addEventListener("pointermove", function (e) { if (dragging) setWipe(fromEvent(e)); });
    var stop = function () { dragging = false; };
    frame.addEventListener("pointerup", stop);
    frame.addEventListener("pointercancel", stop);
    handle.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === "ArrowLeft") { setWipe(pos - step); e.preventDefault(); }
      else if (e.key === "ArrowRight") { setWipe(pos + step); e.preventDefault(); }
      else if (e.key === "Home") { setWipe(0); e.preventDefault(); }
      else if (e.key === "End") { setWipe(100); e.preventDefault(); }
    });
    // 처음 한 번만: 선이 오른쪽에서 가운데로 들어와 Log 원본을 보여 준다
    if (!reduce) {
      setWipe(82);
      var t0 = null;
      var anim = function (t) {
        if (dragging) return;
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 1300);
        setWipe(82 - 32 * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(anim);
      };
      setTimeout(function () { requestAnimationFrame(anim); }, 450);
    }
  }

  // ── 2) 룩 바꿔 끼우기 ──
  var looks = site.looks || [];
  var lookBtns = $$(".looks [role=radio]");
  var gImg = $("[data-grade-img]"), gSrc = $("[data-grade-source]"), gTag = $("[data-grade-tag]"), gDesc = $("[data-look-desc]");
  function pickLook(i, focus) {
    var L = looks[i];
    if (!L) return;
    lookBtns.forEach(function (b, j) {
      b.setAttribute("aria-checked", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    if (gSrc) gSrc.srcset = L.file_960;
    if (gImg) { gImg.src = L.file; gImg.alt = "같은 장면에 " + L.title + " 룩을 입힌 결과"; }
    if (gTag) gTag.textContent = L.title;
    if (gDesc) gDesc.textContent = L.description;
    if (focus) lookBtns[i].focus();
  }
  lookBtns.forEach(function (b, i) {
    b.addEventListener("click", function () { pickLook(i); });
    b.addEventListener("keydown", function (e) {
      var n = lookBtns.length, k = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") k = (i + 1) % n;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") k = (i - 1 + n) % n;
      else if (e.key === "Home") k = 0;
      else if (e.key === "End") k = n - 1;
      if (k !== null) { e.preventDefault(); pickLook(k, true); }
    });
  });
  // 다른 룩 이미지를 미리 받아 둔다 (바꿀 때 깜빡이지 않게)
  window.addEventListener("load", function () {
    var small = window.matchMedia("(max-width: 760px)").matches;
    looks.slice(1).forEach(function (L) { var im = new Image(); im.src = small ? L.file_960 : L.file; });
  });

  // ── 3) 작업 순서 탭 ──
  var PAGES = {
    media: ["MEDIA", "원본 Log 스틸이나 영상을 불러오고 카메라와 Log 종류를 고릅니다. 미디어 풀에 모아 둔 클립을 바로 꺼내 쓸 수 있고, 레퍼런스 스틸을 올려 Shot Match 를 실행합니다."],
    conform: ["CONFORM", "여러 컷을 한 줄에 늘어놓고 같은 룩을 걸어 장면 전체의 색을 맞춥니다. XML · EDL 타임라인을 읽거나 Resolve 타임라인을 그대로 가져올 수 있습니다."],
    color: ["COLOR", "컬러 휠, 커브, 노드, Power Window 로 룩을 만듭니다. 오른쪽 스코프와 노드 패널을 보면서 하나씩 쌓아 갑니다."],
    film: ["FILM LAB", "네거티브와 프린트 필름을 고르고 증감 현상, 프린터 라이트, 그레인으로 필름 현상소의 과정을 거칩니다."],
    deliver: ["DELIVER", "출력 색공간을 고르고 납품 QC 를 돌린 뒤 .cube, Resolve 노드 패키지, HDR 듀얼 마스터로 내보냅니다."]
  };
  var tabs = $$(".page-tabs [role=tab]"), pImg = $("[data-page-img]"), pText = $("[data-page-text]"), panel = $("#pp");
  function pickPage(i, focus) {
    var t = tabs[i];
    if (!t) return;
    var key = t.getAttribute("data-page"), info = PAGES[key];
    tabs.forEach(function (b, j) {
      b.setAttribute("aria-selected", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", t.id);
    pImg.srcset = "img/pages/" + key + "_800.jpg 800w, img/pages/" + key + ".jpg 1600w";
    pImg.src = "img/pages/" + key + ".jpg";
    pImg.alt = info[0] + " 페이지 실제 화면";
    pText.textContent = info[1];
    if (focus) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { pickPage(i); });
    t.addEventListener("keydown", function (e) {
      var n = tabs.length, k = null;
      if (e.key === "ArrowRight") k = (i + 1) % n;
      else if (e.key === "ArrowLeft") k = (i - 1 + n) % n;
      else if (e.key === "Home") k = 0;
      else if (e.key === "End") k = n - 1;
      if (k !== null) { e.preventDefault(); pickPage(k, true); }
    });
  });

  // ── 4) 설치 파일 · 포터블 버튼 ──
  function guard(selector, url, message, onPending) {
    var buttons = $$(selector);
    if (!buttons.length) return;
    function pending() {
      buttons.forEach(function (b) {
        b.classList.add("is-pending");
        b.setAttribute("aria-disabled", "true");
        b.addEventListener("click", function (e) { e.preventDefault(); toast(message); });
      });
      if (onPending) onPending();
    }
    if (!url) { pending(); return; }
    if (/^https?:/i.test(url)) { buttons.forEach(function (b) { b.setAttribute("rel", "noopener"); }); return; }
    buttons.forEach(function (b) { b.setAttribute("download", ""); });
    if (location.protocol.indexOf("http") === 0) {
      fetch(url, { method: "HEAD", cache: "no-store" })
        .then(function (r) { if (!r.ok) pending(); })
        .catch(pending);
    }
  }
  var inst = site.installer || {}, port = site.portable || {};
  guard("[data-installer]", inst.url, "설치 파일을 준비하고 있습니다. 그동안 웹 버전을 써 보세요.", function () {
    var meta = $("[data-installer-meta]");
    if (meta) meta.textContent = "설치 파일을 준비하고 있습니다. 그동안 웹 버전을 써 보세요.";
  });
  guard("[data-portable]", port.url, "포터블 zip 을 준비하고 있습니다. 그동안 웹 버전을 써 보세요.");

  // ── 5) SHA-256 복사 ──
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy");
      var done = function () { b.textContent = "복사됨"; setTimeout(function () { b.textContent = "복사"; }, 1600); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { toast(text); });
      } else {
        toast(text);
      }
    });
  });

  // ── 6) 웹 버전을 이 페이지 안에서 열기 ──
  var webFrame = $("[data-web-frame]"), openBtn = $("[data-web-open]");
  if (webFrame && openBtn) {
    openBtn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "app/";
      f.title = "CineMaster AI 웹 버전";
      f.setAttribute("allow", "clipboard-write; fullscreen");
      f.setAttribute("allowfullscreen", "");
      webFrame.innerHTML = "";
      webFrame.appendChild(f);
      var bar = document.createElement("div");
      bar.className = "web-bar";
      var full = document.createElement("button");
      full.type = "button";
      full.className = "btn btn-line";
      full.textContent = "전체 화면으로 보기";
      full.addEventListener("click", function () { if (webFrame.requestFullscreen) webFrame.requestFullscreen(); });
      var win = document.createElement("a");
      win.className = "btn btn-line";
      win.href = "app/";
      win.target = "_blank";
      win.rel = "noopener";
      win.textContent = "새 창으로 열기";
      bar.appendChild(full);
      bar.appendChild(win);
      webFrame.parentNode.insertBefore(bar, webFrame.nextSibling);
      f.focus();
    });
  }
})();
