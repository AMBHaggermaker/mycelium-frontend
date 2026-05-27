import DonateButton from '../components/DonateButton';

const MERCH_EMAIL = 'aliciambh82@protonmail.com';

const PRODUCTS = [
  {
    id: 'hygiene',
    icon: '🧴',
    name: 'Hygiene & Body',
    description: 'Handmade soaps, body butters, and personal care products made with local and natural ingredients. Each batch is small and crafted with care.',
    items: [
      { name: 'Herbal Bar Soap', price: '$8' },
      { name: 'Shea Body Butter', price: '$14' },
      { name: 'Lip Balm Set (3)', price: '$10' },
    ],
  },
  {
    id: 'shirts',
    icon: '👕',
    name: 'T-Shirts & Merch',
    description: 'Mycelium community apparel. Designs celebrate mutual aid, Huntsville roots, and the network of people holding this place together.',
    items: [
      { name: 'Mycelium Logo Tee', price: '$22' },
      { name: 'Mutual Aid Crewneck', price: '$38' },
      { name: 'HSV Roots Tee', price: '$22' },
    ],
  },
  {
    id: 'stickers',
    icon: '🎨',
    name: 'Stickers',
    description: 'Weatherproof vinyl stickers. Good for laptops, water bottles, bikes, and anywhere else you want to show what you are about.',
    items: [
      { name: 'Mycelium Logo Sticker', price: '$3' },
      { name: 'Mutual Aid Sticker Pack (5)', price: '$10' },
      { name: 'HSV Community Sticker', price: '$3' },
    ],
  },
];

function orderSubject(productName) {
  return `Mycelium Merch Order — ${productName}`;
}

export default function Merch() {
  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <h1 className="page-title">Support Mycelium</h1>
            <p className="page-subtitle">Made by hand in Huntsville, Alabama by the platform founder</p>
          </div>
        </div>

        <div className="merch-banner">
          <p>
            Every purchase directly supports keeping Mycelium running and free for the community.
            All items are made locally in Huntsville, Alabama.
            To order, click the button on any product and send an email — you will hear back within 48 hours.
          </p>
        </div>

        <div className="merch-grid">
          {PRODUCTS.map(product => (
            <div key={product.id} className="merch-card">
              <div className="merch-card-icon">{product.icon}</div>
              <h2 className="merch-card-name">{product.name}</h2>
              <p className="merch-card-desc">{product.description}</p>
              <ul className="merch-item-list">
                {product.items.map(item => (
                  <li key={item.name} className="merch-item-row">
                    <span className="merch-item-name">{item.name}</span>
                    <span className="merch-item-price">{item.price}</span>
                  </li>
                ))}
              </ul>
              <a
                className="btn btn-primary btn-full merch-order-btn"
                href={`mailto:${MERCH_EMAIL}?subject=${encodeURIComponent(orderSubject(product.name))}&body=${encodeURIComponent(`Hi, I'd like to order from the ${product.name} category. Please let me know what is currently available and how to pay. Thank you!`)}`}
              >
                Contact to Order
              </a>
            </div>
          ))}
        </div>

        <div className="merch-donate-section">
          <div className="merch-donate-inner">
            <div>
              <h2 className="merch-donate-title">Prefer to donate directly?</h2>
              <p className="merch-donate-desc">
                A direct donation — any amount — goes straight toward server costs, maintenance,
                and keeping Mycelium free for everyone in the community.
              </p>
            </div>
            <DonateButton className="btn btn-primary merch-donate-btn" label="Donate via Stripe" />
          </div>
        </div>

        <div className="merch-footer">
          <p>
            Questions? Email <a href={`mailto:${MERCH_EMAIL}`}>{MERCH_EMAIL}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
