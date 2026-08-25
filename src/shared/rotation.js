export function nextIndex(idx, len) {
  if (!(len > 1)) return -1
  return idx + 1 < len ? idx + 1 : -1
}
