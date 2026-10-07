(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WUPlanModel = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const REQUIRED = new Set(['Foundations of Digital Economy', 'Digital Markets and Strategies']);
  const LEGACY_KEY = 'wu-operational-schedule-v1';
  const GUEST_KEY = 'wu-schedule-guest-v2';
  const accountKey = (id, semester) => `wu-schedule-account-v2:${id}:${semester}`;
  const read = (storage, key) => { try { return JSON.parse(storage.getItem(key) || 'null'); } catch (_) { return null; } };
  const write = (storage, key, value) => { try { storage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };
  const remove = (storage, key) => { try { storage.removeItem(key); } catch (_) {} };

  function normalize(plan, courses, owner = false) {
    const known = new Map(courses.map(course => [course.course_id, course]));
    const selected = new Map();
    for (const id of Array.isArray(plan?.selected_course_ids) ? plan.selected_course_ids : []) {
      const course = known.get(id);
      if (course && !selected.has(course.course)) selected.set(course.course, id);
    }
    for (const name of REQUIRED) {
      if (!selected.has(name)) {
        const candidates = courses.filter(course => course.course === name);
        const course = candidates.find(course => course.group === 'A') || candidates[0];
        if (course) selected.set(name, course.course_id);
      }
    }
    return {
      selected_course_ids: [...selected.values()].sort(),
      profile: owner && ['iurii', 'anna', 'both'].includes(plan?.profile) ? plan.profile : 'custom'
    };
  }

  function fromLegacy(saved, courses) {
    if (!saved || !Array.isArray(saved.activeCourses)) return null;
    const selected = courses.filter(course => saved.activeCourses.includes(course.course) &&
      (!course.group || course.group === (saved.groups?.[course.course] || 'A'))).map(course => course.course_id);
    return normalize({ selected_course_ids: selected, profile: saved.profile }, courses, true);
  }

  function toState(plan, courses, owner = false) {
    const normalized = normalize(plan, courses, owner);
    const activeCourses = new Set();
    const groups = Object.fromEntries(courses.filter(course => course.group === 'A').map(course => [course.course, 'A']));
    for (const course of courses) if (normalized.selected_course_ids.includes(course.course_id)) {
      activeCourses.add(course.course); groups[course.course] = course.group || null;
    }
    return { profile: normalized.profile, activeCourses, groups };
  }

  function fromState(state, courses, owner = false) {
    return normalize({ profile: state.profile, selected_course_ids: courses.filter(course =>
      state.activeCourses.has(course.course) && (!course.group || state.groups[course.course] === course.group)
    ).map(course => course.course_id) }, courses, owner);
  }

  return { REQUIRED, LEGACY_KEY, GUEST_KEY, accountKey, read, write, remove, normalize, fromLegacy, toState, fromState };
});
