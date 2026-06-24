const waterfall = <T>(items: T[], asyncFunction: (item: T) => Promise<void>): Promise<void> =>
  items.reduce(
    (lastPromise, item) => lastPromise.then(() => asyncFunction(item)),
    Promise.resolve()
  );

export default waterfall;
