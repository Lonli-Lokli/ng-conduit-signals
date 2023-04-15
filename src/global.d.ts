export * from 'effector';

declare module 'effector' {
    /** rxjs mutate global types in an obscure incompatible way
     * so we enrich effector types locally */
    interface Store<State> extends Unit<State> {
      [Symbol.observable]: () => Subscribable<State>;
    }
  }