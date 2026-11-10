export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(job: () => Promise<T>): Promise<T> {
    const next = tail.then(job);
    tail = next.then(() => undefined, () => undefined);
    return next;
  };
}
