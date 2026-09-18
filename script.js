(function () {
  'use strict';

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById('navToggle');
  var siteNav = document.getElementById('siteNav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = siteNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        siteNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Header solid-on-scroll ---------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var updateHeader = function () {
      if (window.scrollY > 40) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  /* ---------- Parallax ----------
     Elements with [data-parallax] shift vertically at a fraction of scroll
     speed (data-parallax-speed, default 0.2). Respects reduced-motion. */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));

  if (parallaxEls.length && !reduceMotion) {
    var ticking = false;

    var applyParallax = function () {
      var viewportH = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.2;
        var rect = el.getBoundingClientRect();
        // Only animate elements near the viewport for performance
        if (rect.bottom < -200 || rect.top > viewportH + 200) return;
        var offset = (rect.top - viewportH / 2) * speed;
        var img = el.tagName === 'IMG' ? el : el.querySelector('img');
        if (img) {
          img.style.transform = 'translateY(' + offset.toFixed(1) + 'px) scale(1.12)';
        }
      });
      ticking = false;
    };

    var requestTick = function () {
      if (!ticking) {
        window.requestAnimationFrame(applyParallax);
        ticking = true;
      }
    };

    applyParallax();
    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
  }

  /* ---------- Audio player ----------
     Drives .track-list / .player-bar pairs on album pages (lux.html, within.html).
     Each <li class="track"> carries data-src / data-title; clicking a track (or its
     play button) loads it into the shared <audio> element and plays it. */
  var trackList = document.getElementById('trackList');
  var audioEl = document.getElementById('audioEl');
  var playerBar = document.getElementById('playerBar');

  if (trackList && audioEl && playerBar) {
    var playerToggle = document.getElementById('playerToggle');
    var playerTrackTitle = document.getElementById('playerTrackTitle');
    var playerProgress = document.getElementById('playerProgress');
    var playerProgressFill = document.getElementById('playerProgressFill');
    var playerTime = document.getElementById('playerTime');
    var tracks = Array.prototype.slice.call(trackList.querySelectorAll('.track'));
    var currentTrack = null;

    var formatTime = function (secs) {
      if (!isFinite(secs) || secs < 0) return '0:00';
      var m = Math.floor(secs / 60);
      var s = Math.floor(secs % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    };

    var setActiveTrack = function (trackEl) {
      tracks.forEach(function (t) { t.classList.remove('is-active', 'is-playing'); });
      trackEl.classList.add('is-active', 'is-playing');
      currentTrack = trackEl;
      playerTrackTitle.textContent = trackEl.getAttribute('data-title') || 'Untitled';
    };

    var loadTrack = function (trackEl, autoplay) {
      var src = trackEl.getAttribute('data-src');
      if (audioEl.getAttribute('src') !== src) {
        audioEl.setAttribute('src', src);
      }
      setActiveTrack(trackEl);
      if (autoplay) {
        audioEl.play().catch(function () {
          /* Playback may be blocked until the file exists / user gesture; fail quietly. */
        });
      }
    };

    var playPause = function () {
      if (!currentTrack) {
        if (tracks.length) loadTrack(tracks[0], true);
        return;
      }
      if (audioEl.paused) {
        audioEl.play().catch(function () {});
      } else {
        audioEl.pause();
      }
    };

    tracks.forEach(function (trackEl) {
      trackEl.addEventListener('click', function () {
        if (currentTrack === trackEl) {
          playPause();
        } else {
          loadTrack(trackEl, true);
        }
      });
    });

    playerToggle.addEventListener('click', playPause);

    audioEl.addEventListener('play', function () {
      playerBar.classList.add('is-playing');
      if (currentTrack) currentTrack.classList.add('is-playing');
    });
    audioEl.addEventListener('pause', function () {
      playerBar.classList.remove('is-playing');
      if (currentTrack) currentTrack.classList.remove('is-playing');
    });
    audioEl.addEventListener('timeupdate', function () {
      var pct = audioEl.duration ? (audioEl.currentTime / audioEl.duration) * 100 : 0;
      playerProgressFill.style.width = pct + '%';
      playerTime.textContent = formatTime(audioEl.currentTime) + ' / ' + formatTime(audioEl.duration);
    });
    audioEl.addEventListener('loadedmetadata', function () {
      playerTime.textContent = formatTime(audioEl.currentTime) + ' / ' + formatTime(audioEl.duration);
    });
    audioEl.addEventListener('ended', function () {
      var idx = tracks.indexOf(currentTrack);
      var next = tracks[idx + 1];
      if (next) {
        loadTrack(next, true);
      } else {
        playerBar.classList.remove('is-playing');
        if (currentTrack) currentTrack.classList.remove('is-playing');
      }
    });

    playerProgress.addEventListener('click', function (e) {
      if (!audioEl.duration) return;
      var rect = playerProgress.getBoundingClientRect();
      var pct = (e.clientX - rect.left) / rect.width;
      audioEl.currentTime = pct * audioEl.duration;
    });
  }
})();
