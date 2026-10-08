// Lets the global search hand a record to the page that should open it
// (the page reads it once when it mounts, or when the event fires while it is already open).

let pending = null;
const EVENT = 'agenda:focus-target';

export function setFocusTarget(target) {
  pending = target;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: target }));
}

export function takeFocusTarget(type) {
  if (pending && pending.type === type) {
    const t = pending;
    pending = null;
    return t;
  }
  return null;
}

export function onFocusTarget(type, handler) {
  const listener = (e) => {
    if (e.detail?.type === type) {
      pending = null;
      handler(e.detail);
    }
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
