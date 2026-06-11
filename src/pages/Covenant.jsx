import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import api from '../api';
import WhyThisWorks from '../components/WhyThisWorks';

export default function Covenant() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [agreed,   setAgreed]   = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [done,     setDone]     = useState(false);
  const [alreadyAgreed, setAlreadyAgreed] = useState(false);

  useEffect(() => {
    if (user?.covenant_agreed) setAlreadyAgreed(true);
  }, [user]);

  async function handleAgree() {
    if (!agreed) return;
    setBusy(true);
    try {
      await api.agreeToCovenant(token);
      setDone(true);
      setAlreadyAgreed(true);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="page-header">
          <div>
            <h1 className="page-title">⬡ The Mycelium Covenant</h1>
            <p className="page-subtitle">The principles this community is built on</p>
          </div>
        </div>

        <WhyThisWorks id="covenant-not-tos">
          Terms of service protect the platform from users. A Covenant is a mutual commitment between the platform and the community. The difference is whether this document is a weapon aimed at you or a promise made to you.
        </WhyThisWorks>

        <div className="covenant-page-body">
          <section className="covenant-section">
            <p className="covenant-preamble">
              Mycelium is a community platform built for the people of North Alabama and the Tennessee Valley —
              a place where neighbors share, organize, bear witness, and hold power accountable.
              This Covenant is not a terms-of-service document. It is an agreement among people who
              believe that the health of a community depends on how we treat each other and the truth.
            </p>
          </section>

          <section className="covenant-section">
            <h2 className="covenant-heading">I. We show up honestly.</h2>
            <p>We use our real names or consistent identities. We do not create fake accounts, impersonate
            others, or misrepresent who we are. When we make a mistake, we own it. When we change our
            minds, we say so. Honesty is the foundation everything else rests on.</p>
          </section>

          <section className="covenant-section">
            <h2 className="covenant-heading">II. We protect each other's safety.</h2>
            <p>We do not share information that could put someone at risk — their location, their
            undocumented status, their health, their safety situation. We do not coordinate harassment,
            threats, or intimidation. If we see something that could harm a member of this community,
            we say something.</p>
          </section>

          <section className="covenant-section">
            <h2 className="covenant-heading">III. We are committed to accuracy.</h2>
            <p>We distinguish between what we know, what we believe, and what we've heard. We do not
            spread rumors as facts. We label speculation as speculation. When we report on something
            we've witnessed — a chemical smell, a surveillance drone, a suspicious land sale — we say
            where, when, and how we know. Accuracy is an act of respect for everyone who reads us.</p>
          </section>

          <section className="covenant-section">
            <h2 className="covenant-heading">IV. We do not weaponize this platform.</h2>
            <p>We do not use Mycelium to harass, stalk, doxx, or harm individuals. We do not coordinate
            pile-ons. We do not target private individuals for exposure. Holding institutions and
            elected officials accountable is encouraged. Targeting neighbors is not.</p>
          </section>

          <section className="covenant-section">
            <h2 className="covenant-heading">V. We take environmental and civic reporting seriously.</h2>
            <p>The Watch, Advocate, and Lost &amp; Found tools exist because real harms happen in this
            community. We use them carefully and honestly. False reports waste collective attention and
            erode trust in legitimate ones. When we submit a report, we are asking others to take it
            seriously — so we make sure it deserves that.</p>
          </section>

          <section className="covenant-section">
            <h2 className="covenant-heading">VI. We respect the network.</h2>
            <p>Mycelium grows through trust. Invitations carry weight because members have vouched for
            each other. We do not invite people we wouldn't vouch for in person. We do not share
            invite links publicly. Access is a responsibility, not just a privilege.</p>
          </section>

          <section className="covenant-section">
            <h2 className="covenant-heading">VII. We take care of the vulnerable.</h2>
            <p>We are especially protective of children, the elderly, those in crisis, and people with
            less power in the room. Content that exploits or endangers them has no place here.
            This includes how we talk about missing persons, housing instability, and families under
            pressure from systems that don't see them.</p>
          </section>

          <section className="covenant-section">
            <h2 className="covenant-heading">VIII. We remember why we're here.</h2>
            <p>Mycelium exists because the Tennessee Valley deserves a community-owned space where
            neighbors can organize, share resources, document what's happening to their land and air
            and water, and find each other in hard times. We protect that mission by living these
            principles — not just by agreeing to them.</p>
          </section>

          <section className="covenant-section">
            <h2 className="covenant-heading">Child Safety Exception</h2>
            <p>
              The only absolute exception to our law enforcement partnership policy is child sexual abuse material.
              Any confirmed child sexual abuse material discovered on this platform will be reported to the
              National Center for Missing and Exploited Children and relevant law enforcement immediately
              and without exception. This is not a compromise of our sovereignty principles. It is a moral
              line that admits no ambiguity. Documenting child exploitation to stop it is legitimate.
              Sharing exploitative material under any framing is not.
            </p>
          </section>

          <section className="covenant-section covenant-closing">
            <p>
              By joining Mycelium, you agree to uphold this Covenant — not because you are required to,
              but because you understand what's at stake. Violations may result in removal, but we'd
              rather you stay and be a good neighbor.
            </p>
            <p style={{ fontStyle: 'italic', color: 'var(--muted)', marginTop: '.5rem' }}>
              — AMBHaggermaker, Mycelium Founding Member
            </p>
          </section>
        </div>

        {user && !alreadyAgreed && !done && (
          <div className="covenant-agree-box">
            <label className="covenant-agree-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span>I have read and agree to The Mycelium Covenant</span>
            </label>
            <button
              className="btn btn-primary"
              disabled={!agreed || busy}
              onClick={handleAgree}
            >
              {busy ? 'Saving…' : 'Record My Agreement'}
            </button>
          </div>
        )}

        {(done || alreadyAgreed) && user && (
          <div className="covenant-agreed-notice">
            <span className="covenant-agreed-check">✓</span>
            <span>You have formally agreed to The Mycelium Covenant.</span>
            {user.covenant_agreed_at && (
              <span className="covenant-agreed-date">
                {new Date(user.covenant_agreed_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })}
              </span>
            )}
          </div>
        )}

        {!user && (
          <div className="covenant-agree-box" style={{ opacity: .65 }}>
            <p style={{ fontSize: '.9rem', color: 'var(--muted)', margin: 0 }}>
              Sign in or create an account to formally record your agreement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
