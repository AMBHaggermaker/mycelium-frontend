import { Link } from 'react-router-dom';

export default function DonationThanks() {
  return (
    <div className="donation-thanks-page">
      <div className="donation-thanks-card">
        <div className="donation-thanks-icon">⬡</div>
        <h1 className="donation-thanks-title">Thank you for supporting Mycelium</h1>
        <p className="donation-thanks-body">
          Your contribution helps keep this platform free, independent, and sovereign for the North Alabama community.
          The mycelium grows because of people like you.
        </p>
        <Link to="/" className="btn btn-primary donation-thanks-btn">
          Return to Platform
        </Link>
      </div>
    </div>
  );
}
