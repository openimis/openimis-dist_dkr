export function capitalizeWords(str) {
  return str.replace(/\b\w/g, char => char.toUpperCase());
}

export function getTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
