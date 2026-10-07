(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./plan-model.js'));
  else root.WUAccount = factory(root.WUPlanModel);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (model) {
  'use strict';

  function createController(options) {
    const { config, courses, storage, createClient, location, history, onChange } = options;
    const semester = config.semesterCode;
    const enabled = Boolean(config.supabaseUrl && config.supabasePublishableKey && createClient);
    let client = null, user = null, owner = false, presets = {}, revision = 0;
    let status = 'local', message = '', locked = false, pending = false;
    let epoch = 0, edit = 0, saving = false, timer = null, stopped = false, subscription = null;
    let conflict = null, importCandidate = null, legacyImported = false;
    let plan = model.normalize(model.read(storage, model.GUEST_KEY)?.plan, courses);

    const snapshot = () => ({ user, owner, presets, revision, status, message, locked, pending,
      conflict, importCandidate, enabled, plan: structuredClone(plan) });
    const notify = (changed = false) => onChange(snapshot(), changed);
    const cacheKey = () => user && model.accountKey(user.id, semester);
    const cache = () => {
      const key = cacheKey();
      if (key) model.write(storage, key, { plan, revision, pending, owner, presets });
    };
    const isCurrent = token => !stopped && token === epoch;
    const cancelTimer = () => { if (timer) clearTimeout(timer); timer = null; };
    const setStatus = (value, text = '') => { status = value; message = text; notify(); };

    function clearAccount() {
      cancelTimer(); epoch++; edit++;
      const key = cacheKey();
      if (key) model.remove(storage, key);
      user = null; owner = false; presets = {}; revision = 0; pending = false;
      conflict = null; importCandidate = null; locked = false; saving = false;
      legacyImported = false;
      plan = model.normalize(null, courses);
      model.remove(storage, model.GUEST_KEY);
      status = 'local'; message = ''; notify(true);
    }

    function scheduleSave() {
      cancelTimer();
      if (user && !locked && !conflict) timer = setTimeout(() => { timer = null; flush(); }, 500);
    }

    function setPlan(next) {
      if (locked) return;
      plan = model.normalize(next, courses, owner); edit++;
      if (!user) {
        const saved = model.write(storage, model.GUEST_KEY, { plan, edited: true });
        status = saved ? 'local' : 'error';
        message = saved ? '' : 'Your browser could not save this schedule.';
      } else {
        pending = true; cache();
        if (!conflict) { status = 'pending'; message = ''; scheduleSave(); }
      }
      notify();
    }

    async function loadContext(verifiedUser, token) {
      const previousId = user?.id;
      const guest = !previousId ? model.read(storage, model.GUEST_KEY) : null;
      if (previousId && previousId !== verifiedUser.id) model.remove(storage, cacheKey());
      user = { id: verifiedUser.id, name: verifiedUser.user_metadata?.full_name || verifiedUser.email || 'Your account' };
      owner = false; presets = {}; revision = 0; conflict = null; importCandidate = null;
      locked = true; pending = false; plan = model.normalize(null, courses);
      status = 'loading'; message = ''; notify(true);
      const cached = model.read(storage, cacheKey());
      const { data, error } = await client.rpc('get_schedule_context', { p_semester: semester });
      if (!isCurrent(token)) return;
      if (error) {
        if (cached && !['42501', 'PGRST301', 'PGRST302'].includes(error.code)) {
          owner = Boolean(cached.owner); presets = cached.presets || {};
          revision = cached.revision || 0; pending = Boolean(cached.pending);
          plan = model.normalize(cached.plan, courses, owner); locked = false;
          status = 'offline'; message = 'Showing this device’s saved schedule. Reconnect to sync.';
        } else {
          status = 'error'; message = 'Your account could not be loaded. Please retry.';
        }
        notify(true); return;
      }
      if (data.user_id && data.user_id !== verifiedUser.id) { await refresh(); return; }
      owner = data.is_owner === true; presets = owner ? data.presets || {} : {};
      const legacy = owner ? model.fromLegacy(model.read(storage, model.LEGACY_KEY), courses) : null;
      revision = data.plan?.revision || 0; locked = false;
      if (cached?.pending) {
        plan = model.normalize(cached.plan, courses, owner); pending = true;
        if (revision !== cached.revision) {
          conflict = { plan: data.plan, revision };
          // Keep the draft's base revision in the cache. Otherwise a reload
          // would appear to acknowledge the cloud revision and overwrite it.
          revision = cached.revision || 0;
          status = 'conflict'; message = 'This schedule changed on another device. Choose which version to keep.';
        } else { status = 'pending'; scheduleSave(); }
      } else if (data.plan) {
        plan = model.normalize(data.plan, courses, owner); status = 'saved';
        if (legacy) importCandidate = legacy;
        else if (guest?.edited) importCandidate = model.normalize(guest.plan, courses, owner);
      } else {
        legacyImported = Boolean(legacy);
        plan = legacy || model.normalize(guest?.edited ? guest.plan : { profile: owner ? 'iurii' : 'custom' }, courses, owner);
        pending = true; status = 'pending'; scheduleSave();
      }
      cache(); notify(true);
    }

    async function refresh() {
      if (!client) return;
      cancelTimer();
      const token = ++epoch;
      saving = false;
      const { data: sessionData } = await client.auth.getSession();
      if (!isCurrent(token)) return;
      if (!sessionData.session) { if (user) clearAccount(); return; }
      const { data, error } = await client.auth.getUser();
      if (!isCurrent(token)) return;
      if (error || !data.user) {
        if (error?.status === 401 || error?.status === 403) {
          await client.auth.signOut({ scope: 'local' });
          if (isCurrent(token)) clearAccount();
        } else {
          // Only restore a previously downloaded account cache, never grant
          // cloud access from session metadata stored on the device.
          const sessionUser = sessionData.session.user;
          const cached = model.read(storage, model.accountKey(sessionUser.id, semester));
          if (cached) {
            user = { id: sessionUser.id, name: sessionUser.user_metadata?.full_name || 'Your account' };
            owner = Boolean(cached.owner); presets = cached.presets || {};
            plan = model.normalize(cached.plan, courses, owner); revision = cached.revision || 0;
            pending = Boolean(cached.pending); locked = false; status = 'offline';
            message = 'Showing this device’s saved schedule. Reconnect to sync.'; notify(true);
          } else setStatus('error', 'Sign-in could not be verified. Reconnect and retry.');
        }
        return;
      }
      await loadContext(data.user, token);
    }

    async function flush() {
      if (!client || !user || !pending || saving || locked || conflict) return;
      const token = epoch, sentEdit = edit, sentPlan = structuredClone(plan);
      saving = true; setStatus('saving');
      try {
        const { data, error } = await client.rpc('save_schedule_plan', {
          p_semester: semester, p_course_ids: sentPlan.selected_course_ids,
          p_profile: sentPlan.profile, p_expected_revision: revision
        });
        if (!isCurrent(token)) return;
        if (error) {
          if (error.code === '40001') {
            // Refresh the revision without replacing the local draft.
            conflict = { plan: null, revision: null }; status = 'conflict'; notify();
            const remote = await client.rpc('get_schedule_context', { p_semester: semester });
            if (!isCurrent(token)) return;
            conflict = { plan: remote.data?.plan || null, revision: remote.data?.plan?.revision ?? null };
            setStatus('conflict', 'This schedule changed on another device. Choose which version to keep.');
          } else if (['42501', '22023'].includes(error.code)) {
            setStatus('error', 'This selection could not be saved. Reload your account and try again.');
          } else setStatus('offline', 'Your changes are saved on this device. Reconnect to sync.');
          cache(); return;
        }
        revision = data.revision;
        pending = edit !== sentEdit;
        if (!pending && legacyImported) { model.remove(storage, model.LEGACY_KEY); legacyImported = false; }
        cache(); setStatus(pending ? 'pending' : 'saved');
      } catch (_) {
        if (isCurrent(token)) { cache(); setStatus('offline', 'Your changes are saved on this device. Reconnect to sync.'); }
      } finally {
        if (isCurrent(token)) {
          saving = false;
          if (pending && status === 'pending') scheduleSave();
        }
      }
    }

    async function resolveConflict(choice) {
      if (!conflict) return;
      if (conflict.revision === null) { await refresh(); return; }
      revision = conflict.revision;
      if (choice === 'cloud') {
        plan = model.normalize(conflict.plan, courses, owner); pending = false;
      } else pending = true;
      conflict = null; status = pending ? 'pending' : 'saved'; message = ''; edit++;
      cache(); notify(true); if (pending) await flush();
    }

    function importGuest() {
      if (!importCandidate || locked) return;
      plan = importCandidate; importCandidate = null;
      legacyImported = owner && Boolean(model.read(storage, model.LEGACY_KEY));
      model.remove(storage, model.GUEST_KEY); setPlan(plan); notify(true);
    }
    function dismissImport() {
      importCandidate = null; model.remove(storage, model.GUEST_KEY);
      if (owner) model.remove(storage, model.LEGACY_KEY);
      notify();
    }

    async function signIn() {
      if (!client) return;
      setStatus('signing-in');
      const redirect = new URL('index.html', location.href);
      redirect.search = ''; redirect.hash = '';
      const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
        redirectTo: redirect.href, queryParams: { prompt: 'select_account' }
      } });
      if (error) setStatus('error', 'Google sign-in could not start. Please try again.');
    }

    async function signOut() {
      if (!client) return;
      // Cancel queued edits and ignore in-flight results before changing accounts.
      cancelTimer(); epoch++; locked = true; setStatus('signing-out');
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) { locked = false; setStatus('error', 'Sign-out failed. Please retry.'); return; }
      clearAccount();
    }

    async function start() {
      notify(true);
      if (!enabled) return;
      client = createClient(config.supabaseUrl, config.supabasePublishableKey, { auth: {
        flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true,
        storage, storageKey: 'wu-schedule-auth-v2'
      } });
      const url = new URL(location.href), code = url.searchParams.get('code');
      const failed = url.searchParams.has('error');
      if (code || failed) {
        let error = failed;
        if (code && !failed) { const result = await client.auth.exchangeCodeForSession(code); error = result.error; }
        for (const key of ['code', 'error', 'error_code', 'error_description']) url.searchParams.delete(key);
        history.replaceState(null, '', url.pathname + url.search + (url.hash || '#agenda'));
        if (error) setStatus('error', 'Google sign-in could not be completed. Please try again.');
      }
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (stopped || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
        if (event === 'SIGNED_OUT') clearAccount();
        else if (event === 'SIGNED_IN' && session?.user.id !== user?.id) {
          if (user) clearAccount();
          // Run outside the SDK callback to avoid holding its auth lock.
          setTimeout(() => { if (!stopped) refresh(); }, 0);
        }
      });
      subscription = data.subscription;
      await refresh();
    }

    const destroy = () => { stopped = true; epoch++; cancelTimer(); subscription?.unsubscribe(); };
    return { start, snapshot, setPlan, flush, refresh, signIn, signOut, resolveConflict, importGuest, dismissImport, destroy };
  }
  return { createController };
});
