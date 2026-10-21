const prefix = 'nm-read-public-alerts';

function key(userId) {
  return `${prefix}:${userId || 'guest'}`;
}

export function getReadPublicAlertIds(userId) {
  try {
    const raw = localStorage.getItem(key(userId));
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set();
  }
}

export function markPublicAlertRead(userId, alertId) {
  if (!alertId) return;
  const ids = getReadPublicAlertIds(userId);
  ids.add(String(alertId));
  try {
    localStorage.setItem(key(userId), JSON.stringify(Array.from(ids).slice(-500)));
  } catch {}
  window.dispatchEvent(new CustomEvent('nm-alert-read'));
}

export function markAllPublicAlertsRead(userId, rows = []) {
  const ids = getReadPublicAlertIds(userId);
  rows.forEach(row => row?._id && ids.add(String(row._id)));
  try {
    localStorage.setItem(key(userId), JSON.stringify(Array.from(ids).slice(-500)));
  } catch {}
  window.dispatchEvent(new CustomEvent('nm-alert-read'));
}
