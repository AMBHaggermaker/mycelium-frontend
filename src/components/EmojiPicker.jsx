import { useState, useEffect, useRef } from 'react';

const CATEGORIES = {
  'Smileys': ['😀','😁','😂','🤣','😃','😄','😅','😆','😉','😊','😋','😎','😍','🥰','😘','🤩','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  'People': ['👋','🤚','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🫂','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','👣','👁','👀','🫦'],
  'Nature': ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎','🦕','🦖','🐊','🐸'],
  'Food': ['🍎','🍊','🍋','🍌','🍍','🥭','🍓','🫐','🍈','🍒','🍑','🥝','🍅','🫒','🥥','🥑','🍆','🥔','🥕','🌽','🌶️','🥑','🧄','🧅','🥜','🌰','🍞','🥐','🥖','🫓','🥨','🥯','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🍕','🫔','🌮','🌯','🍔','🍟'],
  'Activities': ['⚽','🏀','🏈','⚾','🥎','🏐','🏉','🥏','🎾','🪃','🏸','🏒','🏑','🥍','🏓','🏸','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🏇','🧘','🏄','🧗','🚵','🎯','🎱','🎮','🕹️','🎲','♟️','🧩','🪄','🎭','🎨','🎬','🎤','🎧','🎼'],
  'Travel': ['🚀','✈️','🛸','🚁','🛩️','🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🛵','🏍️','🚲','🛴','🛺','🚨','🚥','🚦','🛑','⛽','🗺️','🗼','🗽','🗾','🎌'],
  'Objects': ['💡','🔦','🕯️','💰','💳','💎','⚖️','🔑','🗝️','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🔧','🔩','⚙️','🪤','🧲','🪜','🧱','🪞','🪟','🛋️','🪑','🚽','🪠','🚿','🛁','🪣','🧹','🧺','🧻','🧼','🫧','🪥','🧽','🧯','🛒','🚪','🪦','🧴','🪒'],
  'Symbols': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☯️','🔯','🕎','⭐','🌟','💫','⚡','☄️','💥','🔥','🌈','☀️','🌤️','⛅','🌦️','🌈','🌊','💨','🌀','🌪️','❄️','⛄','🌙','💧','💦'],
};

const ALL_CATS = Object.keys(CATEGORIES);

export default function EmojiPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState(ALL_CATS[0]);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const filtered = search.trim()
    ? Object.values(CATEGORIES).flat().filter(e => e.includes(search))
    : CATEGORIES[cat] || [];

  return (
    <div ref={ref} className="emoji-picker-panel">
      <div className="emoji-picker-header">
        <input
          className="emoji-picker-search"
          placeholder="Search emoji…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
        <button className="chat-picker-close" onClick={onClose}>✕</button>
      </div>
      {!search && (
        <div className="emoji-picker-cats">
          {ALL_CATS.map(c => (
            <button key={c} className={'emoji-cat-btn' + (cat === c ? ' active' : '')}
              onClick={() => setCat(c)} title={c}>
              {CATEGORIES[c][0]}
            </button>
          ))}
        </div>
      )}
      <div className="emoji-picker-grid">
        {filtered.map((e, i) => (
          <button key={i} className="emoji-btn" onClick={() => onSelect(e)} title={e}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
