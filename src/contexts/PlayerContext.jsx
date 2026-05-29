import { createContext, useContext, useReducer, useRef } from 'react';

const PlayerContext = createContext(null);

const initialState = {
  track: null,      // { id, title, maker_name, username, r2_url }
  isPlaying: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_TRACK':
      return { track: action.track, isPlaying: true };
    case 'TOGGLE':
      return { ...state, isPlaying: !state.isPlaying };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

export function PlayerProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const audioRef = useRef(null);

  function setTrack(track) { dispatch({ type: 'SET_TRACK', track }); }
  function toggle()        { dispatch({ type: 'TOGGLE' }); }
  function pause()         { dispatch({ type: 'PAUSE' }); }
  function clearTrack()    { dispatch({ type: 'CLEAR' }); }

  return (
    <PlayerContext.Provider value={{ ...state, setTrack, toggle, pause, clearTrack, audioRef }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
