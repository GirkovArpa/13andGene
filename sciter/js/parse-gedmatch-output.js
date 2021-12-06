/**
 * @returns {Number[]}
 */
export default function (string) {
  const regex = /[\d\.]+|(?<=\s)-/g;
  const matches = string
    .match(regex)
    .map(Number)
    .map((value) => (isNaN(value) ? 0 : value));
  
  for (let i = 0; i < 13; i++) {
    matches[i] = matches[i] || 0;
  }
  
  return matches;
}
