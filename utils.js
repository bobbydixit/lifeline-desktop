export async function watch(fn, timeout) {

  while (true) {
    const d = new Date();

    console.log("Checking at", d.toLocaleTimeString());
    await fn();
    // sleep
    await sleep(timeout);
  }
}

export function sleep(time) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}
