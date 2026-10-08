    (() => {
      'use strict';

      const ICONS = {
        agenda: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
        planner: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
        settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 9 19.35a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.09A1.7 1.7 0 0 0 4.65 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.03-1.56V3h4v.09A1.7 1.7 0 0 0 15 4.65a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.03H21v4h-.09A1.7 1.7 0 0 0 19.4 15Z"/></svg>',
        database: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></svg>',
        left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
        right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
        close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
        users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        presentation: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v12H3zM8 21l4-6 4 6M12 3V1"/></svg>',
        language: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/></svg>',
        hash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>',
        map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
        external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h7"/></svg>',
        download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>'
      };

      document.querySelectorAll('[data-icon]').forEach(node => { node.innerHTML = ICONS[node.dataset.icon] || ''; });

      // Personal presets are returned only for the owner's verified account.
      const PEOPLE = {};
      const PROFILE_LABELS = { iurii: 'Iurii', anna: 'Anna', both: 'Both', custom: 'Custom' };
      const PROFILE_PEOPLE = { iurii: ['iurii'], anna: ['anna'], both: ['iurii', 'anna'] };
      const REQUIRED_COURSES = new Set(['Foundations of Digital Economy', 'Digital Markets and Strategies']);
      const COURSE_ECTS = {
        'Foundations of Digital Economy': 4,
        'Digital Markets and Strategies': 8,
        'Business Process Management': 4,
        'Marketing and Innovation': 4,
        'IT Governance, Risk and Control': 4,
        'System Development and Operations': 4,
        'Security and Privacy': 4,
        'Value-Based System Engineering': 4,
        'Data Management': 4
      };
      const COURSE_SHORT = {
        'Foundations of Digital Economy': 'Foundations',
        'Digital Markets and Strategies': 'Digital Markets',
        'Business Process Management': 'Business Processes',
        'Marketing and Innovation': 'Marketing',
        'IT Governance, Risk and Control': 'IT Governance',
        'System Development and Operations': 'System Development',
        'Security and Privacy': 'Security',
        'Value-Based System Engineering': 'Value-Based SE',
        'Data Management': 'Data Management'
      };
      const COURSE_COLORS = {
        'Foundations of Digital Economy': '#e9893f',
        'Digital Markets and Strategies': '#1769e0',
        'Data Management': '#2e9d66',
        'System Development and Operations': '#d14d8b',
        'Marketing and Innovation': '#8d70dc',
        'Value-Based System Engineering': '#20a59b',
        'Security and Privacy': '#d16048',
        'IT Governance, Risk and Control': '#6f64ce',
        'Business Process Management': '#477f75'
      };
      const pageTitles = { agenda: 'My schedule', planner: 'Semester planner', settings: 'Settings' };
      const dateFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
      const shortDateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
      const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      let DATA = null;
      let state = null;
      let courseNames = [];
      let groupsByCourse = {};
      let eventById = {};
      let visibleEvents = [];
      let currentView = 'agenda';
      const viewScrollPositions = {};
      let activeAgendaDate = null;
      let displayedWeekStart = null;
      let agendaObserver = null;
      let plannerMonths = [];
      let plannerMonthIndex = 0;
      let installPrompt = null;
      let account = null;
      let accountInfo = { owner: false, user: null, locked: false, enabled: false, status: 'local' };

      const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
      const parseDate = value => new Date(`${value}T12:00:00Z`);
      const isoDate = date => date.toISOString().slice(0, 10);
      const addDays = (value, count) => { const date = parseDate(value); date.setUTCDate(date.getUTCDate() + count); return isoDate(date); };
      const getToday = timezone => {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
        return `${parts.year}-${parts.month}-${parts.day}`;
      };
      const getCurrentTime = timezone => {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
        return `${parts.hour}:${parts.minute}`;
      };
      const getMonday = value => { const date = parseDate(value); const offset = (date.getUTCDay() + 6) % 7; date.setUTCDate(date.getUTCDate() - offset); return isoDate(date); };
      const datesBetween = (start, end) => { const dates = []; for (let value = start; value <= end; value = addDays(value, 1)) dates.push(value); return dates; };
      const minutes = time => { const [hours, mins] = time.split(':').map(Number); return hours * 60 + mins; };
      const eventDuration = event => minutes(event.end_time) - minutes(event.start_time);
      const eventPeople = event => Object.entries(PEOPLE).filter(([, person]) => person.courseIds.has(event.course_id)).map(([key]) => key);
      const getMapUrl = event => {
        if (event.delivery_mode === 'online' || /online/i.test(event.room || '')) return null;
        const query = String(event.room || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+(Audimax|OeNB)$/i, '').trim();
        return query ? `https://campus.wu.ac.at/?q=${encodeURIComponent(query)}` : null;
      };

      function loadState() {
        state = WUPlanModel.toState(account.snapshot().plan, DATA.courses, accountInfo.owner);
      }

      function saveState() {
        account.setPlan(WUPlanModel.fromState(state, DATA.courses, accountInfo.owner));
      }

      function availableProfiles() {
        return accountInfo.owner && PEOPLE.iurii && PEOPLE.anna ? ['iurii', 'anna', 'both', 'custom'] : ['custom'];
      }

      function receiveAccount(info, changed) {
        const lockChanged = accountInfo.locked !== info.locked;
        accountInfo = info;
        if (changed) {
          for (const key of Object.keys(PEOPLE)) delete PEOPLE[key];
          for (const [key, person] of Object.entries(info.presets || {})) {
            if (!['iurii', 'anna'].includes(key)) continue;
            PEOPLE[key] = { name: String(person.name), color: /^#[0-9a-f]{6}$/i.test(person.color) ? person.color : '#1769e0', courseIds: new Set(person.courseIds) };
          }
          PROFILE_LABELS.custom = info.owner ? 'Custom' : 'My schedule';
          state = WUPlanModel.toState(info.plan, DATA.courses, info.owner);
          if (!availableProfiles().includes(state.profile)) state.profile = 'custom';
          updateVisibleEvents(); renderSettings(); renderPlanner(); renderAgenda(true);
        }
        if (!changed && lockChanged) renderSettings();
        renderAccount();
      }

      function renderAccount() {
        const info = accountInfo;
        document.querySelector('#account-title').textContent = info.user ? info.user.name : 'Your account';
        document.querySelector('#account-description').textContent = info.user
          ? 'Signed in with Google'
          : info.enabled ? 'Sign in with Google to save your schedule across devices.' : 'You can plan on this device. Google sign-in will be available once account setup is complete.';
        const labels = { local: 'Now courses selection is saved on the device', loading: 'Loading your schedule…', pending: 'Waiting to save…',
          saving: 'Saving…', saved: '', offline: 'Offline', conflict: 'Choose a schedule version',
          error: 'Could not sync', 'signing-in': 'Opening Google…', 'signing-out': 'Signing out…' };
        const saveStatus = document.querySelector('#save-status');
        saveStatus.textContent = info.message || labels[info.status] || '';
        saveStatus.hidden = !saveStatus.textContent;
        saveStatus.dataset.syncStatus = info.status;
        const busy = info.locked || ['loading', 'signing-in', 'signing-out'].includes(info.status);
        const button = (action, label, disabled = false, primary = false) => `<button class="button${primary ? ' button-primary' : ''}" type="button" data-account-action="${action}"${disabled ? ' disabled' : ''}>${label}</button>`;
        let actions = info.user ? button('sign-out', 'Sign out', busy) : button('sign-in', 'Continue with Google', !info.enabled || busy, true);
        if (info.user && ['offline', 'error'].includes(info.status)) actions += button('retry', 'Retry', false, true);
        if (info.conflict) actions += button('use-cloud', 'Use cloud schedule', info.conflict.revision === null) + button('use-local', 'Keep this device’s schedule', info.conflict.revision === null);
        if (info.importCandidate) actions += '<p>You also have a schedule saved before signing in. Keep your cloud schedule or replace it with this device’s selection.</p>' + button('import', 'Use device selection') + button('dismiss-import', 'Keep cloud selection');
        document.querySelector('#account-actions').innerHTML = actions;
        const headerButton = document.querySelector('#header-account');
        headerButton.textContent = 'Sign in';
        headerButton.disabled = !info.user && (!info.enabled || busy);
        headerButton.hidden = Boolean(info.user);
        const select = document.querySelector('#profile-select');
        select.hidden = !info.owner; select.disabled = busy;
      }

      function eventIsVisible(event) {
        if (state.profile === 'custom') return state.activeCourses.has(event.course) && (!event.group || state.groups[event.course] === event.group);
        return PROFILE_PEOPLE[state.profile].some(personKey => PEOPLE[personKey].courseIds.has(event.course_id));
      }

      function selectedCourseNames() {
        if (state.profile === 'custom') return [...state.activeCourses];
        const selectedIds = new Set(PROFILE_PEOPLE[state.profile].flatMap(personKey => [...PEOPLE[personKey].courseIds]));
        return [...new Set(DATA.courses.filter(course => selectedIds.has(course.course_id)).map(course => course.course))];
      }

      function updateVisibleEvents() {
        visibleEvents = DATA.events.filter(eventIsVisible).sort((a, b) => `${a.date} ${a.start_time}`.localeCompare(`${b.date} ${b.start_time}`));
      }

      function setProfile(profile) {
        if (accountInfo.locked || !availableProfiles().includes(profile)) return;
        state.profile = profile;
        saveState();
        document.querySelector('#profile-select').value = profile;
        updateVisibleEvents();
        renderSettings();
        renderPlanner();
        renderAgenda(true);
      }

      const viewOrder = ['agenda', 'planner', 'settings'];
      let mobileScrollTarget = null;

      function activateView(view, updateHash = true, restoreScroll = null, saveScroll = true, fromScroll = false) {
        if (!pageTitles[view]) view = 'agenda';
        const mobile = window.matchMedia('(max-width: 780px)').matches;
        const main = document.querySelector('.app-main');
        if (saveScroll && view !== currentView && DATA) {
          viewScrollPositions[currentView] = mobile ? document.querySelector(`[data-view="${currentView}"]`).scrollTop : window.scrollY;
        }
        currentView = view;
        document.querySelectorAll('[data-view]').forEach(element => {
          const active = element.dataset.view === view;
          // Mobile panels stay mounted in their own scroll containers throughout
          // the gesture, including its final frame. Only accessibility state changes.
          element.hidden = !mobile && !active;
          element.inert = mobile && !active;
          if (mobile && !active) element.setAttribute('aria-hidden', 'true'); else element.removeAttribute('aria-hidden');
        });
        document.querySelectorAll('[data-view-button]').forEach(button => {
          if (button.dataset.viewButton === view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
        });
        document.querySelector('#page-title').textContent = pageTitles[view];
        document.querySelector('#today-button').hidden = view !== 'agenda';
        if (updateHash) history.replaceState(null, '', `#${view}`);
        const panel = document.querySelector(`[data-view="${view}"]`);
        const position = restoreScroll ?? viewScrollPositions[view];
        if (position === undefined && view === 'agenda' && DATA) {
          focusAgendaDate(activeAgendaDate || getToday(DATA.timezone), false);
          viewScrollPositions.agenda = mobile ? panel.scrollTop : window.scrollY;
        } else if (!mobile) {
          window.scrollTo({ top: position ?? 0, behavior: 'instant' });
        } else if (restoreScroll !== null) {
          panel.scrollTo({ top: restoreScroll, behavior: 'instant' });
        }
        if (mobile && !fromScroll) {
          const left = viewOrder.indexOf(view) * main.clientWidth;
          mobileScrollTarget = Math.abs(main.scrollLeft - left) > 1 ? view : null;
          const smooth = updateHash && !main.classList.contains('is-initializing') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          main.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' });
        }
      }

      function setupViewSwipes() {
        const main = document.querySelector('.app-main');
        const mobile = window.matchMedia('(max-width: 780px)');
        let settleTimer = null;
        const settle = () => {
          clearTimeout(settleTimer);
          if (!mobile.matches || !DATA || !main.clientWidth) return;
          const index = Math.max(0, Math.min(viewOrder.length - 1, Math.round(main.scrollLeft / main.clientWidth)));
          const view = viewOrder[index];
          if (Math.abs(main.scrollLeft - index * main.clientWidth) > 1) return;
          if (mobileScrollTarget && mobileScrollTarget !== view) return;
          mobileScrollTarget = null;
          main.classList.remove('is-swiping');
          if (currentView !== view) activateView(view, true, null, true, true);
          if (view === 'agenda') setupAgendaObserver();
        };
        // Native horizontal scrolling handles drag, momentum, snap-back and click
        // cancellation without transforming or rebuilding the sticky Agenda DOM.
        main.addEventListener('scroll', () => {
          if (!mobile.matches || !DATA) return;
          main.classList.add('is-swiping');
          clearTimeout(settleTimer);
          settleTimer = setTimeout(settle, 140);
        }, { passive: true });
        main.addEventListener('scrollend', settle);
        main.addEventListener('touchstart', () => { mobileScrollTarget = null; }, { passive: true });
        main.addEventListener('wheel', () => { mobileScrollTarget = null; }, { passive: true });
        document.querySelectorAll('[data-view]').forEach(panel => panel.addEventListener('scroll', () => {
          if (mobile.matches) viewScrollPositions[panel.dataset.view] = panel.scrollTop;
        }, { passive: true }));
        let wasMobile = mobile.matches;
        window.addEventListener('scroll', () => {
          if (!mobile.matches && DATA) viewScrollPositions[currentView] = window.scrollY;
        }, { passive: true });
        window.addEventListener('resize', () => {
          if (!DATA) return;
          clearTimeout(settleTimer);
          main.classList.remove('is-swiping');
          const changedLayout = wasMobile !== mobile.matches;
          wasMobile = mobile.matches;
          activateView(currentView, false, changedLayout ? viewScrollPositions[currentView] ?? 0 : null, false);
          setupAgendaObserver();
        });
      }

      function renderWeekStrip(start, end) {
        const today = getToday(DATA.timezone);
        const eventsByDate = new Set(visibleEvents.map(event => event.date));
        document.querySelector('#week-strip').innerHTML = datesBetween(getMonday(start), addDays(getMonday(end), 6)).map(value => {
          const parsed = parseDate(value);
          const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(parsed).slice(0, 3).toUpperCase();
          return `<button class="date-button${value === today ? ' is-today' : ''}${eventsByDate.has(value) ? ' has-events' : ''}" type="button" data-agenda-date="${value}" aria-label="${escapeHtml(dateFormatter.format(parsed))}"${value === today ? ' aria-current="date"' : ''}><span>${weekday}</span><strong>${parsed.getUTCDate()}</strong><i></i></button>`;
        }).join('');
        document.querySelectorAll('[data-agenda-date]').forEach(button => button.addEventListener('click', () => focusAgendaDate(button.dataset.agendaDate, true)));
        displayedWeekStart = null;
      }

      function scrollWeekIntoView(date, smooth = true) {
        const weekStart = getMonday(date);
        if (displayedWeekStart === weekStart) return;
        const strip = document.querySelector('#week-strip');
        const firstDay = strip.querySelector(`[data-agenda-date="${weekStart}"]`);
        if (!firstDay || strip.clientWidth === 0) return;
        const left = firstDay.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
        displayedWeekStart = weekStart;
        strip.scrollTo({ left, behavior: smooth ? 'smooth' : 'instant' });
      }

      function renderEventCard(event) {
        const today = getToday(DATA.timezone);
        const currentTime = getCurrentTime(DATA.timezone);
        const isPast = event.date < today || (event.date === today && event.end_time <= currentTime);
        const isNow = event.date === today && event.start_time <= currentTime && currentTime < event.end_time;
        const group = event.group ? `Group ${escapeHtml(event.group)}` : '';
        const type = escapeHtml(event.event_type || 'Class');
        const people = state.profile === 'both' ? eventPeople(event).map(personKey => `<span class="person-tag" style="--person-color:${PEOPLE[personKey].color}">${escapeHtml(PEOPLE[personKey].name)}</span>`).join('') : '';
        return `<button class="event-card${isPast ? ' is-past' : ''}${isNow ? ' is-now' : ''}" style="--event-color:${COURSE_COLORS[event.course]}" type="button" data-event-id="${escapeHtml(event.id)}" aria-label="${escapeHtml(event.course)}, ${event.start_time} to ${event.end_time}, ${escapeHtml(event.room || 'room not specified')}"><span class="event-time"><strong>${event.start_time}</strong><span>${event.end_time}</span>${isNow ? '<span class="today-label">Now</span>' : ''}</span><span class="event-accent"></span><span class="event-copy"><h3>${escapeHtml(event.course)}</h3><span class="event-meta"><span class="event-tag">${type}${group ? ` · ${group}` : ''}</span>${people}<span class="room-link">${escapeHtml(event.room || 'Room not specified')}</span></span></span><span class="event-arrow">${ICONS.right}</span></button>`;
      }

      function renderNextCard() {
        const today = getToday(DATA.timezone);
        const currentTime = getCurrentTime(DATA.timezone);
        const upcoming = visibleEvents.find(event => event.date > today || (event.date === today && event.end_time > currentTime));
        const card = document.querySelector('#next-card');
        if (!upcoming) {
          card.className = 'next-card is-empty';
          card.innerHTML = '<small>No upcoming classes</small><strong>This saved semester schedule has ended.</strong>';
          return;
        }
        const timing = upcoming.date === today ? (upcoming.start_time <= currentTime ? 'Happening now' : `Today at ${upcoming.start_time}`) : `${dateFormatter.format(parseDate(upcoming.date))} · ${upcoming.start_time}`;
        card.className = 'next-card';
        card.innerHTML = `<small>${escapeHtml(timing)}</small><strong>${escapeHtml(upcoming.course)}</strong><span class="next-card-meta"><span>${escapeHtml(upcoming.room || 'Room not specified')}</span><span>${escapeHtml(upcoming.event_type || 'Class')}${upcoming.group ? ` · Group ${escapeHtml(upcoming.group)}` : ''}</span></span>`;
        card.setAttribute('role', 'button');
        card.tabIndex = 0;
        card.onclick = () => showEvent(upcoming.id);
        card.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showEvent(upcoming.id); } };
      }

      function renderAgenda(anchorToday = false) {
        if (!DATA) return;
        updateVisibleEvents();
        const today = getToday(DATA.timezone);
        let start = getMonday(DATA.date_min);
        let end = addDays(getMonday(DATA.date_max), 6);
        const currentWeekStart = getMonday(today);
        if (today < start) start = currentWeekStart;
        if (today > end) end = addDays(currentWeekStart, 6);
        const byDate = Object.groupBy ? Object.groupBy(visibleEvents, event => event.date) : visibleEvents.reduce((result, event) => ((result[event.date] ||= []).push(event), result), {});
        document.querySelector('#agenda-feed').innerHTML = datesBetween(start, end).map(date => {
          const entries = byDate[date] || [];
          return `<section class="agenda-day${date === today ? ' is-today' : ''}" id="agenda-${date}" data-day-date="${date}"><h2 class="day-heading"><time datetime="${date}"${date === today ? ' aria-current="date"' : ''}>${escapeHtml(dateFormatter.format(parseDate(date)))}</time>${date === today ? '<span class="today-label">Today</span>' : ''}</h2><div class="day-events">${entries.length ? entries.map(renderEventCard).join('') : '<div class="empty-day">No classes</div>'}</div></section>`;
        }).join('');
        document.querySelectorAll('[data-event-id]').forEach(button => button.addEventListener('click', () => showEvent(button.dataset.eventId)));
        activeAgendaDate = activeAgendaDate && document.querySelector(`#agenda-${activeAgendaDate}`) ? activeAgendaDate : today;
        renderWeekStrip(start, end);
        requestAnimationFrame(() => scrollWeekIntoView(activeAgendaDate, false));
        renderNextCard();
        setupAgendaObserver();
        if (anchorToday && currentView === 'agenda') requestAnimationFrame(() => focusToday(false));
      }

      function setupAgendaObserver() {
        if (agendaObserver) agendaObserver.disconnect();
        const isMobile = window.matchMedia('(max-width: 780px)').matches;
        const panel = document.querySelector('#agenda-view');
        const agendaTop = isMobile ? 67 + document.querySelector('.agenda-summary').offsetHeight : 145;
        agendaObserver = new IntersectionObserver(() => {
          const main = document.querySelector('.app-main');
          if (currentView !== 'agenda' || main.classList.contains('is-swiping') || main.classList.contains('is-initializing')) return;
          // Observer batches contain only changed entries; read the current layout
          // so restoring a tab cannot select an arbitrary newly intersecting day.
          const sections = [...document.querySelectorAll('#agenda-feed [data-day-date]')];
          const focusLine = (isMobile ? panel.getBoundingClientRect().top : 0) + (sections.length ? parseFloat(getComputedStyle(sections[0]).scrollMarginTop) || agendaTop : agendaTop);
          const visible = sections.find(section => section.getBoundingClientRect().bottom > focusLine + 1);
          if (!visible) return;
          const date = visible.dataset.dayDate;
          if (date !== activeAgendaDate) {
            activeAgendaDate = date;
            scrollWeekIntoView(date, true);
          }
        }, { root: isMobile ? panel : null, rootMargin: `-${agendaTop}px 0px ${isMobile ? '0px' : '-65%'} 0px`, threshold: 0 });
        document.querySelectorAll('[data-day-date]').forEach(section => agendaObserver.observe(section));
      }

      function focusAgendaDate(date, smooth) {
        const section = document.querySelector(`#agenda-${date}`);
        if (!section) return;
        document.documentElement.style.setProperty('--agenda-summary-height', `${document.querySelector('.agenda-summary').offsetHeight}px`);
        activeAgendaDate = date;
        scrollWeekIntoView(date, smooth);
        if (window.matchMedia('(max-width: 780px)').matches) {
          const panel = document.querySelector('#agenda-view');
          const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
          panel.scrollTo({ top: Math.max(0, panel.scrollTop + section.getBoundingClientRect().top - panel.getBoundingClientRect().top - margin), behavior: smooth ? 'smooth' : 'instant' });
        } else {
          section.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'instant' });
        }
      }

      function focusToday(smooth = true) { focusAgendaDate(getToday(DATA.timezone), smooth); }

      function formatGenerated(value) {
        const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+02:00`;
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.valueOf()) ? value : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: DATA.timezone }).format(parsed);
      }

      function renderPlanner() {
        if (!DATA) return;
        updateVisibleEvents();
        const monthKey = plannerMonths[plannerMonthIndex];
        const [year, month] = monthKey.split('-').map(Number);
        const monthDate = new Date(Date.UTC(year, month - 1, 1, 12));
        const monthLabel = monthFormatter.format(monthDate);
        const monthEvents = visibleEvents.filter(event => event.date.startsWith(monthKey));
        const courseSelection = selectedCourseNames();
        const metricsMarkup = (courses, events) => {
          const totalMinutes = events.reduce((sum, event) => sum + eventDuration(event), 0);
          const ects = courses.reduce((sum, course) => sum + (COURSE_ECTS[course] || 0), 0);
          return `<span class="metric"><strong>${courses.length}</strong> courses</span><span class="metric"><strong>${ects}</strong> ECTS</span><span class="metric"><strong>${events.length}</strong> scheduled sessions</span><span class="metric"><strong>${new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 }).format(totalMinutes / 60)}</strong> class hours</span>`;
        };
        document.querySelector('#current-month-label').textContent = monthLabel;
        document.querySelector('#planner-subtitle').textContent = `${PROFILE_LABELS[state.profile]} · ${DATA.semester}`;
        document.querySelector('#planner-metrics').innerHTML = state.profile === 'both'
          ? PROFILE_PEOPLE.both.map(personKey => {
            const person = PEOPLE[personKey];
            const courses = [...new Set(DATA.courses.filter(course => person.courseIds.has(course.course_id)).map(course => course.course))];
            const events = monthEvents.filter(event => person.courseIds.has(event.course_id));
            return `<section class="planner-person-metrics" style="--person-color:${person.color}" aria-labelledby="planner-metrics-${personKey}"><h2 id="planner-metrics-${personKey}">${escapeHtml(person.name)}</h2><div class="planner-metrics">${metricsMarkup(courses, events)}</div></section>`;
          }).join('')
          : metricsMarkup(courseSelection, monthEvents);
        document.querySelector('#previous-month').disabled = plannerMonthIndex === 0;
        document.querySelector('#next-month').disabled = plannerMonthIndex === plannerMonths.length - 1;
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const firstOffset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
        const today = getToday(DATA.timezone);
        let html = '<div class="month-day is-outside" role="gridcell"></div>'.repeat(firstOffset);
        for (let day = 1; day <= daysInMonth; day++) {
          const date = `${monthKey}-${String(day).padStart(2, '0')}`;
          const entries = monthEvents.filter(event => event.date === date);
          html += `<div class="month-day${date === today ? ' is-today' : ''}" role="gridcell"${date === today ? ' aria-current="date"' : ''}><span class="month-number">${day}</span><div class="month-events">${entries.map(event => `<button class="month-event" type="button" style="--event-color:${COURSE_COLORS[event.course]}" data-event-id="${escapeHtml(event.id)}" aria-label="${escapeHtml(event.course)}, ${event.start_time}"><strong>${escapeHtml(COURSE_SHORT[event.course] || event.course)}</strong><span>${event.start_time}–${event.end_time}</span></button>`).join('')}</div></div>`;
        }
        const trailing = (7 - ((firstOffset + daysInMonth) % 7)) % 7;
        html += '<div class="month-day is-outside" role="gridcell"></div>'.repeat(trailing);
        document.querySelector('#month-grid').innerHTML = html;
        document.querySelectorAll('#month-grid [data-event-id]').forEach(button => button.addEventListener('click', () => showEvent(button.dataset.eventId)));
      }

      function renderSettings() {
        if (!DATA) return;
        const profiles = availableProfiles();
        document.querySelector('#profile-select').innerHTML = profiles.map(profile => `<option value="${profile}">${PROFILE_LABELS[profile]}</option>`).join('');
        document.querySelector('#profile-select').value = state.profile;
        document.querySelector('#courses-description').textContent = accountInfo.owner ? 'Select Custom to edit your courses. Required courses remain enabled.' : 'Choose your course groups. Required courses remain enabled.';
        const editable = state.profile === 'custom' && !accountInfo.locked;
        const presetIds = state.profile === 'custom' ? null : new Set(PROFILE_PEOPLE[state.profile].flatMap(key => [...PEOPLE[key].courseIds]));
        document.querySelector('#course-list').innerHTML = courseNames.map((course, index) => {
          const required = REQUIRED_COURSES.has(course);
          const checked = presetIds ? DATA.courses.some(item => item.course === course && presetIds.has(item.course_id)) : state.activeCourses.has(course);
          const groups = groupsByCourse[course];
          const groupSelected = group => presetIds ? DATA.courses.some(item => item.course === course && item.group === group && presetIds.has(item.course_id)) : state.groups[course] === group;
          return `<div class="course-row"><div class="course-check"><input class="course-checkbox" id="custom-course-${index}" type="checkbox" value="${escapeHtml(course)}" ${checked ? 'checked' : ''} ${(!editable || required) ? 'disabled' : ''}><label for="custom-course-${index}">${escapeHtml(course)}<small>${COURSE_ECTS[course] || 0} ECTS${required ? ' · required' : ''}</small></label></div>${groups.length > 1 ? `<div class="group-picker"><span>Group</span>${groups.map(group => `<button class="group-button" type="button" data-course="${escapeHtml(course)}" data-group="${escapeHtml(group)}" aria-pressed="${groupSelected(group)}" ${!editable || !checked ? 'disabled' : ''}>${escapeHtml(group)}</button>`).join('')}</div>` : ''}</div>`;
        }).join('');
        document.querySelectorAll('.course-checkbox').forEach(input => input.addEventListener('change', () => {
          if (accountInfo.locked) return;
          if (input.checked) state.activeCourses.add(input.value); else state.activeCourses.delete(input.value);
          saveState(); updateVisibleEvents(); renderSettings(); renderPlanner(); renderAgenda(true);
        }));
        document.querySelectorAll('.group-button').forEach(button => button.addEventListener('click', () => {
          if (accountInfo.locked) return;
          state.groups[button.dataset.course] = button.dataset.group;
          saveState(); updateVisibleEvents(); renderSettings(); renderPlanner(); renderAgenda(true);
        }));
        document.querySelector('#data-facts').innerHTML = `<div class="data-fact"><span>Semester</span><strong>${escapeHtml(DATA.semester)}</strong></div><div class="data-fact"><span>Last update</span><strong>${escapeHtml(formatGenerated(DATA.generated))}</strong></div><div class="data-fact"><span>Timezone</span><strong>${escapeHtml(DATA.timezone)}</strong></div>`;
      }

      function showEvent(id) {
        const event = eventById[id];
        if (!event) return;
        const dialog = document.querySelector('#event-dialog');
        const mapUrl = getMapUrl(event);
        document.querySelector('#dialog-accent').style.setProperty('--event-color', COURSE_COLORS[event.course]);
        document.querySelector('#event-dialog-title').textContent = event.course;
        document.querySelector('#dialog-badges').innerHTML = `${event.group ? `<span class="event-tag">Group ${escapeHtml(event.group)}</span>` : ''}<span class="event-tag">${escapeHtml(event.event_type || 'Class')}</span>${REQUIRED_COURSES.has(event.course) ? '<span class="event-tag">Required</span>' : ''}`;
        document.querySelector('#dialog-hero').innerHTML = `<div class="dialog-hero-item"><span>Date</span><strong>${escapeHtml(dateFormatter.format(parseDate(event.date)))}</strong></div><div class="dialog-hero-item"><span>Time</span><strong>${event.start_time}–${event.end_time}</strong></div><div class="dialog-hero-item"><span>Room</span><strong>${escapeHtml(event.room || 'Not specified')}</strong></div>`;
        const row = (icon, label, value) => `<div class="detail-row">${ICONS[icon]}<span class="detail-label">${label}</span><span class="detail-value">${escapeHtml(value)}</span></div>`;
        document.querySelector('#dialog-details').innerHTML = `${row('users', 'Instructors', (event.instructors || []).join('; ') || 'Not specified')}${row('presentation', 'Course type', `${event.course_type || 'Not specified'} · ${event.event_label || event.event_type || 'Class'}`)}${row('language', 'Language', event.language || 'Not specified')}${row('hash', 'WU course number', event.course_id)}`;
        document.querySelector('#dialog-actions').innerHTML = `${mapUrl ? `<a class="button" href="${escapeHtml(mapUrl)}" target="_blank" rel="noopener noreferrer">${ICONS.map}Open campus map</a>` : ''}<a class="button button-primary" href="${escapeHtml(event.source_url)}" target="_blank" rel="noopener noreferrer">${ICONS.external}Open in WU</a>`;
        if (!dialog.open) dialog.showModal();
      }

      async function initialize() {
        try {
          const response = await fetch('./data/schedule.json');
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          DATA = await response.json();
          eventById = Object.fromEntries(DATA.events.map(event => [event.id, event]));
          courseNames = [...new Set(DATA.courses.map(course => course.course))].sort((a, b) => Number(REQUIRED_COURSES.has(b)) - Number(REQUIRED_COURSES.has(a)) || a.localeCompare(b));
          groupsByCourse = Object.fromEntries(courseNames.map(course => [course, [...new Set(DATA.courses.filter(item => item.course === course && item.group).map(item => item.group))].sort()]));
          plannerMonths = [...new Set(DATA.events.map(event => event.date.slice(0, 7)))].sort();
          const currentMonth = getToday(DATA.timezone).slice(0, 7);
          plannerMonthIndex = Math.max(0, plannerMonths.indexOf(currentMonth));
          account = WUAccount.createController({
            config: window.WU_AUTH_CONFIG, courses: DATA.courses, storage: localStorage,
            createClient: window.supabase?.createClient, location, history, onChange: receiveAccount
          });
          loadState();
          updateVisibleEvents();
          renderAgenda(false);
          renderPlanner();
          renderSettings();
          renderAccount();
          document.querySelector('#loading-state').hidden = true;
          document.querySelectorAll('[data-view]').forEach(element => { element.hidden = true; });
          // Prepare today's Agenda position before the first visible frame, even
          // when the app opens on another tab through a shortcut or deep link.
          activateView('agenda', false, null, false);
          activateView(location.hash.slice(1) || 'agenda', false);
          requestAnimationFrame(() => {
            document.querySelector('.app-main').classList.remove('is-initializing');
            setupAgendaObserver();
          });
          account.start().catch(() => {
            accountInfo.status = 'error'; accountInfo.message = 'Google sign-in is unavailable. Please retry later.'; renderAccount();
          });
        } catch (error) {
          document.querySelector('#loading-state').hidden = true;
          document.querySelector('#fatal-error').hidden = false;
          document.querySelector('#fatal-message').textContent = `The saved schedule could not be loaded (${error.message}).`;
        }
      }

      setupViewSwipes();
      document.querySelectorAll('[data-view-button]').forEach(button => button.addEventListener('click', () => activateView(button.dataset.viewButton)));
      document.querySelector('#profile-select').addEventListener('change', event => setProfile(event.target.value));
      document.querySelector('#header-account').addEventListener('click', () => {
        if (accountInfo.user) activateView('settings'); else account.signIn().catch(() => receiveAccount({ ...accountInfo, status: 'error', message: 'Google sign-in could not start. Please retry.' }, false));
      });
      document.querySelector('#account-section').addEventListener('click', event => {
        const action = event.target.closest('[data-account-action]')?.dataset.accountAction;
        const handlers = { 'sign-in': () => account.signIn(), 'sign-out': () => account.signOut(), retry: () => account.refresh(),
          'use-cloud': () => account.resolveConflict('cloud'), 'use-local': () => account.resolveConflict('local'),
          import: () => account.importGuest(), 'dismiss-import': () => account.dismissImport() };
        if (handlers[action]) Promise.resolve(handlers[action]()).catch(() => receiveAccount({ ...accountInfo, status: 'error', message: 'This action could not be completed. Please retry.' }, false));
      });
      window.addEventListener('online', () => account?.refresh().catch(() => {}));
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') account?.flush(); });
      document.querySelector('#today-button').addEventListener('click', () => focusToday(true));
      document.querySelector('#previous-month').addEventListener('click', () => { if (plannerMonthIndex > 0) { plannerMonthIndex--; renderPlanner(); } });
      document.querySelector('#next-month').addEventListener('click', () => { if (plannerMonthIndex < plannerMonths.length - 1) { plannerMonthIndex++; renderPlanner(); } });
      document.querySelector('#close-dialog').addEventListener('click', () => document.querySelector('#event-dialog').close());
      document.querySelector('#event-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) event.currentTarget.close(); });
      window.addEventListener('hashchange', () => activateView(location.hash.slice(1) || 'agenda', false));
      window.addEventListener('beforeinstallprompt', event => {
        event.preventDefault(); installPrompt = event;
        const button = document.querySelector('#install-app'); button.hidden = false;
        button.onclick = async () => { await installPrompt.prompt(); installPrompt = null; button.hidden = true; };
      });
      if ('serviceWorker' in navigator && location.protocol !== 'file:') {
        const hadController = Boolean(navigator.serviceWorker.controller);
        let reloadingForUpdate = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // An update must not interrupt the one-time OAuth code exchange.
          const callbackUrl = new URL(location.href);
          if (callbackUrl.searchParams.has('code') || callbackUrl.searchParams.has('error')) return;
          if (hadController && !reloadingForUpdate) {
            reloadingForUpdate = true;
            location.reload();
          }
        });
        window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}));
      }
      const summaryElement = document.querySelector('.agenda-summary');
      const summaryResizeObserver = new ResizeObserver(() => {
        if (!summaryElement.getClientRects().length) return;
        document.documentElement.style.setProperty('--agenda-summary-height', `${summaryElement.offsetHeight}px`);
        if (DATA && currentView === 'agenda') setupAgendaObserver();
      });
      summaryResizeObserver.observe(summaryElement);
      initialize();
    })();
