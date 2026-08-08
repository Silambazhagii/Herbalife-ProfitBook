globalThis.DOMMatrix = class DOMMatrix { constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; } };
globalThis.URL = class URL { constructor(url) { this.href = url; } toString() { return this.href; } };
Promise.withResolvers = Promise.withResolvers || function() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
Promise.try = Promise.try || function(fn, ...args) {
  return new Promise((resolve) => {
    resolve(fn(...args));
  });
};
