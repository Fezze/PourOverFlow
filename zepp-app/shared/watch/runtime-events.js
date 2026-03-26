function getRuntimeEventStore() {
  const app = getApp();

  if (!app.globalData.runtimeEventStore) {
    app.globalData.runtimeEventStore = {
      nextId: 1,
      listeners: {}
    };
  }

  return app.globalData.runtimeEventStore;
}

export function emitRuntimeEvent(event) {
  const store = getRuntimeEventStore();

  Object.values(store.listeners).forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.log("Runtime event listener failed", error);
    }
  });
}

export function subscribeRuntimeEvent(listener) {
  const store = getRuntimeEventStore();
  const listenerId = `listener_${store.nextId++}`;
  store.listeners[listenerId] = listener;

  return () => {
    delete store.listeners[listenerId];
  };
}
