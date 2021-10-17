import { useEffect, useState } from 'react';

export const useStore = store => {
  const [ state, setState ] = useState( store._state );
  useEffect(() => {
    return store.subscribe( setState );
  }, []);
  return [ state, store.dispatch ];
};
