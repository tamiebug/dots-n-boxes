export const createStore = ( reducer, initialState = () => ({}) ) => {
  let store = {
    _state: initialState(),
    _subscribers: new Set(),
    dispatch : function dispatch(action) {
      this._oldState = {...this._state};
      this._state = reducer({...this._state }, action);
      this._subscribers.forEach( callback => callback(this._state, this._oldState) );
    },
    subscribe : function subscribe(callback) {
      this._subscribers.add(callback);
      return () => this._subscribers.delete(callback);
    },
    getState: function getState() { this._state; }
  };

  store.dispatch = store.dispatch.bind(store);
  store.subscribe= store.subscribe.bind(store);
  store.getState = store.getState.bind(store);

  return store;
};