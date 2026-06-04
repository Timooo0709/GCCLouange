let _counter = 0;
export function nextUid(): string {
  return `u${++_counter}`;
}