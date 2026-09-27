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
    // The hero (and any other parallax photo) previously computed its offset
    // relative to the vertical center of the viewport, which meant an
    // element pinned to the very top of the page started with a large
    // negative offset before any scrolling happened — silently cropping
    // extra off the top of the image on load. Storing each element's first
    // computed offset as a baseline and subtracting it keeps every parallax
    // photo visually neutral (matching its CSS object-position) at rest,
    // and only lets it drift as the page actually scrolls.
    var baselines = new WeakMap();

    var applyParallax = function () {
      var viewportH = window.innerHeight;
      parallaxEls.forEach(function (el) {
        var speed = parseFloat(el.getAttribute('data-parallax-speed')) || 0.2;
        var rect = el.getBoundingClientRect();
        // Only animate elements near the viewport for performance
        if (rect.bottom < -200 || rect.top > viewportH + 200) return;
        var rawOffset = (rect.top - viewportH / 2) * speed;
        if (!baselines.has(el)) baselines.set(el, rawOffset);
        var offset = rawOffset - baselines.get(el);
        var img = el.tagName === 'IMG' ? el : el.querySelector('img');
        if (img) {
          img.style.transform = 'translateY(' + offset.toFixed(1) + 'px) scale(1.06)';
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
     play button) loads it into the audio engine and plays it.

     Auto-advance between tracks crossfades rather than hard-cutting, which masks
     both the browser's brief loading gap AND any tiny silence baked into the mp3
     encoding itself — this can't be made perfectly sample-accurate with plain
     <audio> elements, but a short crossfade is inaudible as a "fade" and reads as
     seamless. Tune CROSSFADE_SECONDS below; 0 disables crossfading (hard cut, but
     still gapless-ish since the next track is pre-buffered before it's needed). */
  var trackList = document.getElementById('trackList');
  var audioEl = document.getElementById('audioEl');
  var playerBar = document.getElementById('playerBar');

  if (trackList && audioEl && playerBar) {
    var CROSSFADE_SECONDS = 0.2;

    var playerToggle = document.getElementById('playerToggle');
    var playerTrackTitle = document.getElementById('playerTrackTitle');
    var playerProgress = document.getElementById('playerProgress');
    var playerProgressFill = document.getElementById('playerProgressFill');
    var playerTime = document.getElementById('playerTime');
    var playerError = document.getElementById('playerError');
    var tracks = Array.prototype.slice.call(trackList.querySelectorAll('.track'));
    var currentTrack = null;

    // A second, hidden audio element that the next track gets preloaded into
    // well before it's needed, so it's ready to start instantly at handoff.
    var standbyAudio = document.createElement('audio');
    standbyAudio.preload = 'auto';
    var active = audioEl;
    var standby = standbyAudio;
    var crossfading = false;
    var fadeRafId = null;

    var showError = function (message) {
      if (playerError) {
        playerError.textContent = message;
        playerError.hidden = false;
      }
    };
    var clearError = function () {
      if (playerError) playerError.hidden = true;
    };

    var formatTime = function (secs) {
      if (!isFinite(secs) || secs < 0) return '0:00';
      var m = Math.floor(secs / 60);
      var s = Math.floor(secs % 60);
      return m + ':' + (s < 10 ? '0' : '') + s;
    };

    var trackFor = function (src) {
      return tracks.filter(function (t) { return t.getAttribute('data-src') === src; })[0] || null;
    };

    var setActiveTrack = function (trackEl) {
      tracks.forEach(function (t) { t.classList.remove('is-active', 'is-playing'); });
      trackEl.classList.add('is-active', 'is-playing');
      currentTrack = trackEl;
      playerTrackTitle.textContent = trackEl.getAttribute('data-title') || 'Untitled';
    };

    // Loads src into standby (if not already there/loading) so it's buffered
    // and ready well ahead of when it's actually needed.
    var preloadIntoStandby = function (src) {
      if (!src) return;
      if (standby.getAttribute('data-pending-src') === src) return;
      standby.setAttribute('data-pending-src', src);
      standby.setAttribute('src', src);
      standby.load();
    };

    var preloadNextAfter = function (trackEl) {
      var idx = tracks.indexOf(trackEl);
      var next = tracks[idx + 1];
      if (next) preloadIntoStandby(next.getAttribute('data-src'));
    };

    var cancelFade = function () {
      if (fadeRafId) {
        window.cancelAnimationFrame(fadeRafId);
        fadeRafId = null;
      }
      crossfading = false;
    };

    // Hard switch: used for manual track selection. Stops everything, loads
    // the chosen track into `active`, and immediately starts buffering the
    // track after it into `standby` for the next auto-advance.
    var loadTrack = function (trackEl, autoplay) {
      cancelFade();
      standby.pause();
      standby.removeAttribute('data-pending-src');
      var src = trackEl.getAttribute('data-src');
      clearError();
      active.volume = 1;
      if (active.getAttribute('src') !== src) {
        active.setAttribute('src', src);
      }
      setActiveTrack(trackEl);
      preloadNextAfter(trackEl);
      if (autoplay) {
        active.play().catch(function (err) {
          console.error('Could not play "' + src + '":', err);
          showError('Couldn\u2019t play this track \u2014 check that ' + src + ' exists in your repo with that exact name and capitalization.');
        });
      }
    };

    // Soft handoff: used for auto-advance at the end of a track. `standby`
    // should already be buffered and ready; this ramps volumes across
    // CROSSFADE_SECONDS, then swaps which element is "active" once the
    // outgoing track actually ends.
    var beginCrossfade = function (nextTrackEl) {
      if (crossfading) return;
      var nextSrc = nextTrackEl.getAttribute('data-src');
      if (standby.getAttribute('data-pending-src') !== nextSrc) {
        // Wasn't preloaded in time (e.g. a very short track) — just preload now
        // and start it immediately; there may be a brief gap in this edge case.
        preloadIntoStandby(nextSrc);
      }
      crossfading = true;
      standby.currentTime = 0;
      standby.volume = 0;
      setActiveTrack(nextTrackEl);
      preloadNextAfter(nextTrackEl);
      standby.play().catch(function (err) {
        console.error('Could not start crossfade for "' + nextSrc + '":', err);
        crossfading = false;
      });

      if (CROSSFADE_SECONDS > 0) {
        var startTime = performance.now();
        var outgoing = active;
        var incoming = standby;
        var step = function () {
          var elapsed = (performance.now() - startTime) / 1000;
          var t = Math.min(1, elapsed / CROSSFADE_SECONDS);
          outgoing.volume = 1 - t;
          incoming.volume = t;
          if (t < 1 && crossfading) {
            fadeRafId = window.requestAnimationFrame(step);
          }
        };
        fadeRafId = window.requestAnimationFrame(step);
      } else {
        standby.volume = 1;
      }
    };

    // Called when the outgoing track's 'ended' fires — finalizes the swap.
    var finishCrossfade = function () {
      cancelFade();
      active.pause();
      active.currentTime = 0;
      active.volume = 1;
      var old = active;
      active = standby;
      standby = old;
    };

    var playPause = function () {
      if (!currentTrack) {
        if (tracks.length) loadTrack(tracks[0], true);
        return;
      }
      if (active.paused) {
        active.play().catch(function (err) {
          console.error('Could not play current track:', err);
          showError('Couldn\u2019t play this track \u2014 check the browser console for details.');
        });
      } else {
        active.pause();
        if (crossfading) standby.pause();
      }
    };

    tracks.forEach(function (trackEl) {
      trackEl.addEventListener('click', function () {
        if (currentTrack === trackEl && !crossfading) {
          playPause();
        } else {
          loadTrack(trackEl, true);
        }
      });
    });

    playerToggle.addEventListener('click', playPause);

    var handleError = function (audio) {
      var src = audio.getAttribute('src');
      if (!src || audio !== active) return;
      console.error('Audio error loading "' + src + '":', audio.error);
      showError('Couldn\u2019t load this track \u2014 check that ' + src + ' exists in your repo with that exact name and capitalization.');
    };
    audioEl.addEventListener('error', function () { handleError(audioEl); });
    standbyAudio.addEventListener('error', function () { handleError(standbyAudio); });

    [audioEl, standbyAudio].forEach(function (audio) {
      audio.addEventListener('play', function () {
        if (audio !== active) return;
        playerBar.classList.add('is-playing');
        if (currentTrack) currentTrack.classList.add('is-playing');
      });
      audio.addEventListener('pause', function () {
        if (audio !== active) return;
        playerBar.classList.remove('is-playing');
        if (currentTrack) currentTrack.classList.remove('is-playing');
      });
      audio.addEventListener('timeupdate', function () {
        if (audio !== active) return;
        var pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        playerProgressFill.style.width = pct + '%';
        playerTime.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);

        if (!crossfading && audio.duration && CROSSFADE_SECONDS > 0) {
          var remaining = audio.duration - audio.currentTime;
          var idx = tracks.indexOf(currentTrack);
          var next = tracks[idx + 1];
          if (next && remaining <= CROSSFADE_SECONDS) {
            beginCrossfade(next);
          }
        }
      });
      audio.addEventListener('loadedmetadata', function () {
        if (audio !== active) return;
        playerTime.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
      });
      audio.addEventListener('ended', function () {
        if (audio !== active) return;
        if (crossfading) {
          // The outgoing track finished naturally while the next one was
          // already fading in on standby — finalize the handoff.
          finishCrossfade();
          return;
        }
        // No crossfade in progress (e.g. CROSSFADE_SECONDS is 0, or this was
        // the last track): fall back to a hard switch.
        var idx = tracks.indexOf(currentTrack);
        var next = tracks[idx + 1];
        if (next) {
          loadTrack(next, true);
        } else {
          playerBar.classList.remove('is-playing');
          if (currentTrack) currentTrack.classList.remove('is-playing');
        }
      });
    });

    playerProgress.addEventListener('click', function (e) {
      if (!active.duration) return;
      var rect = playerProgress.getBoundingClientRect();
      var pct = (e.clientX - rect.left) / rect.width;
      active.currentTime = pct * active.duration;
    });
  }
})();
