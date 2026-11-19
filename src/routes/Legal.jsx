import React from 'react';
import { useSelector } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { selectIsAuthenticated } from '../store/auth.reducer';
import { POLICY_EFFECTIVE } from '../helpers/policyDate';

const SUPPORT_EMAIL = 'williamwildernash@gmail.com';

const linkClass = 'underline decoration-primary underline-offset-2 hover:text-secondary';

const PAGES = [
  { title: 'Terms of Service', to: '/terms' },
  { title: 'Privacy Policy', to: '/privacy' },
  { title: 'Account Deletion', to: '/account-deletion' },
  { title: 'Support', to: '/support' },
];

const MailLink = ({ subject, children }) => {
  const href = subject
    ? `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
    : `mailto:${SUPPORT_EMAIL}`;
  return (
    <a href={href} className={linkClass}>
      {children || SUPPORT_EMAIL}
    </a>
  );
};

const Section = ({ title, children }) => (
  <section className="space-y-space-sm">
    <h2 className="font-masthead text-headline-md text-primary text-balance">{title}</h2>
    {children}
  </section>
);

const LegalPage = ({ title, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const onBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
      return;
    }
    navigate(isAuthenticated ? '/profile' : '/login');
  };

  return (
    <article className="mx-auto flex h-dvh max-h-full w-full max-w-measure flex-col">
      <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-background px-margin pt-safe-top">
        <button
          type="button"
          onClick={onBack}
          className="py-space-sm font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary"
        >
          Back
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-margin pb-safe-bottom">
        <div className="py-space-lg">
          <h1 className="font-masthead text-headline-lg text-primary text-balance">{title}</h1>
          <p className="mt-space-sm font-sans text-caption text-muted">Effective {POLICY_EFFECTIVE}</p>
          <div className="mt-space-lg space-y-space-lg font-sans text-body-md text-primary">{children}</div>
          <p className="mt-space-lg font-sans text-body-md text-primary">
            {PAGES.filter((page) => page.title !== title).map((page, index) => (
              <React.Fragment key={page.to}>
                {index > 0 ? <span aria-hidden="true"> · </span> : null}
                <Link to={page.to} className={linkClass}>
                  {page.title}
                </Link>
              </React.Fragment>
            ))}
          </p>
        </div>
      </div>
    </article>
  );
};

export const TermsOfService = () => (
  <LegalPage title="Terms of Service">
    <Section title="Agreement">
      <p>
        These terms govern your use of The Daily Score, including the website at thedailyscore.site and the iOS app.
        The service is operated by William Nash. By creating an account, signing in with Google or Apple, or continuing
        to use the service, you agree to these terms and the{' '}
        <Link to="/privacy" className={linkClass}>Privacy Policy</Link>.
      </p>
    </Section>
    <Section title="The service">
      <p>
        The Daily Score lets you paste a result from a daily game, store that result, and appear on a leaderboard with
        other signed-in readers. You can limit a board to accepted friends. The iOS app can send the notifications you
        turn on, and it can hand a story image to Instagram on your device.
      </p>
      <p>The service is free. We do not sell subscriptions or process payments.</p>
    </Section>
    <Section title="Who can use it">
      <p>
        You must be at least 13 years old. The service is not directed at children under 13. If you are under the age
        of majority where you live, you may use the service only with permission from a parent or guardian.
      </p>
    </Section>
    <Section title="Accounts">
      <p>
        You need an account. You can register with an email and a password, or with Google or Apple when those buttons
        are shown. You choose a display name and a handle. The handle is unique, lowercase, and 3 to 24 characters.
      </p>
      <p>
        You are responsible for activity under your account and for keeping your password confidential. A Google or
        Apple sign-in is controlled by that provider. Tell us at <MailLink /> if you believe someone else is using
        your account. We may refuse a handle, or suspend an account, that breaks these terms.
      </p>
    </Section>
    <Section title="Scores and profiles">
      <p>
        You submit a result by pasting the share text from a daily game. We store that paste, the parsed result, and
        the stats derived from it. Your display name, handle, portrait, and filed scores can be shown to other
        signed-in readers on the leaderboard and on your profile.
      </p>
      <p>
        You keep ownership of the paste and of any portrait you upload. You grant us a license to host, parse, rank,
        and display that material so the service can operate, including showing it to other signed-in readers. The
        license ends when you delete the score or the account, except for copies other people have already saved and
        for short-lived backups described in the Privacy Policy.
      </p>
      <p>
        You can delete one score from your archive, export your scores as a CSV from Settings, or delete the account
        as described in <Link to="/account-deletion" className={linkClass}>Account Deletion</Link>.
      </p>
    </Section>
    <Section title="Games you paste from">
      <p>
        Map Tap, Krillion, Size it Up, Wordle, Redactle, Time Guesser, Semantle, and any later catalog game belong to
        their own publishers. The Daily Score is an independent scoreboard. It is not those games, and it is not
        endorsed by their publishers. You are responsible for following each publisher’s own terms when you play.
      </p>
    </Section>
    <Section title="Friends">
      <p>
        A friend request uses an exact handle. The other person can accept or decline. You can cancel a request you
        sent, and either person can end an accepted friendship. The Friends board shows you and the people who have
        accepted.
      </p>
    </Section>
    <Section title="Notifications and Instagram">
      <p>
        Push notifications are optional. You can turn them off in Settings. On iOS, Share to Instagram builds an image
        on your device and hands it to the Instagram app. What you post
        there is governed by Instagram’s terms. We do not receive your Instagram account from that share.
      </p>
    </Section>
    <Section title="Acceptable use">
      <p>You agree not to:</p>
      <ul className="list-disc space-y-space-xs pl-space-lg">
        <li>impersonate another person or misrepresent your affiliation</li>
        <li>harass, threaten, or abuse another reader</li>
        <li>upload a portrait you do not have the right to use</li>
        <li>submit unlawful content in a paste, a name, a handle, or a game request</li>
        <li>probe, scrape, overload, or disrupt the service, or attempt to access another account</li>
        <li>use the service to send spam or to collect other people’s information</li>
      </ul>
    </Section>
    <Section title="Our intellectual property">
      <p>
        The Daily Score name, masthead, and interface are ours. Game names and logos are used to identify the games
        you file and remain the property of their owners. You may not copy the service or use our name in a way that
        suggests we operate those games.
      </p>
    </Section>
    <Section title="Suspension and ending access">
      <p>
        You may stop using the service and delete your account at any time. We may suspend or close an account that
        breaks these terms, and we may discontinue the service. If we discontinue it, we will post notice on the site
        when we reasonably can.
      </p>
    </Section>
    <Section title="Disclaimers">
      <p>
        The service is provided “as is” and “as available.” Rankings depend on the paste you submit and on our
        parsers. We do not guarantee that the service will be uninterrupted, that a rank is free of error, or that a
        paste from a third-party game will parse. To the fullest extent the law allows, we disclaim implied warranties
        of merchantability, fitness for a particular purpose, and non-infringement.
      </p>
    </Section>
    <Section title="Limitation of liability">
      <p>
        To the fullest extent the law allows, we are not liable for indirect, incidental, special, consequential, or
        punitive damages, or for lost scores, lost ranks, or lost data. Our total liability for a claim arising out of
        the service is limited to the greater of the amount you paid us for the service in the twelve months before
        the claim or ten U.S. dollars. Some places do not allow these limits. In those places, the limits apply only
        as far as the law allows.
      </p>
    </Section>
    <Section title="Changes">
      <p>
        We may update these terms. The date at the top of this page will change. If you keep using the service after
        the updated terms are posted, you accept them. Creating an account records the terms version in effect that day.
      </p>
    </Section>
    <Section title="Contact">
      <p>
        Questions about these terms: <MailLink />.
      </p>
    </Section>
  </LegalPage>
);

export const Privacy = () => (
  <LegalPage title="Privacy Policy">
    <Section title="Who we are">
      <p>
        The Daily Score (“we”) is operated by William Nash. This policy describes the personal information the website
        and the iOS app collect, how we use it, and the choices you have. Contact <MailLink />. The public site is
        https://thedailyscore.site.
      </p>
    </Section>
    <Section title="Information you provide">
      <ul className="list-disc space-y-space-xs pl-space-lg">
        <li>Account details: email, display name, handle, and timezone.</li>
        <li>A password, stored only as a hash, when you create a local account.</li>
        <li>
          A Google or Apple subject identifier, plus the email and name that provider sends, when you use those
          buttons. We never receive your Google or Apple password.
        </li>
        <li>A portrait image, if you choose one.</li>
        <li>
          Scores: the raw paste, the parsed score or guess count, the puzzle number and date, and duration or hints
          when the share includes them.
        </li>
        <li>The catalog games you turn on or off, and night mode and notification preferences.</li>
        <li>Friend requests, acceptances, declines, and removals.</li>
        <li>A game request: the game name and any note you add.</li>
        <li>Messages you send us at the support address.</li>
      </ul>
    </Section>
    <Section title="Information collected automatically">
      <ul className="list-disc space-y-space-xs pl-space-lg">
        <li>
          A session cookie named connect.sid that keeps you signed in. It is an authentication cookie. We do not use
          it for advertising.
        </li>
        <li>
          On the iOS app, an Apple push token and a Firebase registration token, so we can deliver notifications you
          allow. Signing out deletes that device’s token.
        </li>
        <li>
          Operational logs that can include an IP address, the browser or app, and the time of a request. We use them
          for security and to operate the service.
        </li>
      </ul>
      <p>
        We do not sell personal information. We do not run third-party advertising, and we do not build advertising
        profiles.
      </p>
    </Section>
    <Section title="How we use it">
      <ul className="list-disc space-y-space-xs pl-space-lg">
        <li>Create and secure your account, including password reset and email verification links.</li>
        <li>Parse a paste, file the score, and rank it on the leaderboard.</li>
        <li>Show your name, handle, portrait, and scores to other signed-in readers.</li>
        <li>Send a friend request, a friend acceptance, a rank-1 notice, or the 8pm reminder when those notices are on.</li>
        <li>Remember the games you play, your night mode, and your notification choices.</li>
        <li>Respond to support mail and to game requests.</li>
        <li>Detect abuse, keep the service reliable, and comply with law.</li>
      </ul>
      <p>
        Where a privacy law requires a legal basis, we rely on the contract of providing the service you asked for,
        on legitimate interests in securing and operating the leaderboard, and on consent for optional notifications
        and for a portrait you choose to upload.
      </p>
    </Section>
    <Section title="Who can see it">
      <p>
        Leaderboards and profiles are available to signed-in readers. A profile shows your display name, handle,
        portrait, and stats. The Friends scope is limited to you and accepted friends. We do not publish a public feed
        of scores to people who are signed out.
      </p>
      <p>
        We share information with service providers that host and deliver the product: Google Cloud for the
        application, the database, and portrait storage, and Firebase Cloud Messaging for push notifications. Google
        and Apple receive the sign-in request only when you choose those buttons. They process that sign-in under
        their own policies.
      </p>
      <p>
        Share to Instagram happens on your iOS device. We do not receive an Instagram or Facebook user id, and we do
        not send your account to Meta. The image you share is then governed by Instagram.
      </p>
      <p>
        We may disclose information if the law requires it, or if we need to protect the rights, safety, and security
        of readers and the service.
      </p>
    </Section>
    <Section title="Cookies">
      <p>
        We use the session cookie described above. We do not set advertising cookies or use analytics cookies. You can
        clear the cookie in your browser. Clearing it signs you out.
      </p>
    </Section>
    <Section title="How long we keep it">
      <p>
        We keep account information, scores, friendships, and preferences while the account exists. Deleting a score
        in your archive removes that score and its paste. Deleting the account removes the account and the related
        records described on <Link to="/account-deletion" className={linkClass}>Account Deletion</Link>.
      </p>
      <p>
        Password-reset and email-verification tokens are stored as hashes and expire. Device tokens are removed when
        you sign out of that device or delete the account. Routine backups and operational logs can retain a copy
        until those backups and logs expire.
      </p>
    </Section>
    <Section title="Your choices">
      <ul className="list-disc space-y-space-xs pl-space-lg">
        <li>Edit your display name, handle, and email on Profile.</li>
        <li>Replace or leave your portrait.</li>
        <li>Turn notifications and night mode on or off in Settings.</li>
        <li>Choose which catalog games appear.</li>
        <li>Export your scores as a CSV from Settings before you delete anything.</li>
        <li>Delete one score from the archive, or delete the account.</li>
        <li>
          Email <MailLink subject="Privacy request" /> to ask for a copy, a correction, or deletion if you cannot do
          it in the app.
        </li>
      </ul>
    </Section>
    <Section title="Children">
      <p>
        The service is not directed at children under 13, and we do not knowingly collect personal information from
        them. If you believe a child under 13 has an account, email <MailLink /> and we will delete it.
      </p>
    </Section>
    <Section title="Where information is stored">
      <p>
        The application runs on Google Cloud in the United States. The database is hosted in Canada. If you use the
        service from another country, your information is processed in those locations.
      </p>
    </Section>
    <Section title="Additional privacy rights">
      <p>
        Depending on where you live, including California, the United Kingdom, and the European Economic Area, you may
        have the right to access, correct, delete, or export your personal information, and to object to or restrict
        certain processing. We do not sell personal information, and we do not share it for cross-context behavioral
        advertising. Email <MailLink subject="Privacy request" /> to use these rights. We will not discriminate
        against you for making a request. You may also lodge a complaint with your local data protection authority.
      </p>
    </Section>
    <Section title="Changes">
      <p>
        We may update this policy. The date at the top of this page will change. Continued use of the service after
        the update is posted means you accept the updated policy.
      </p>
    </Section>
    <Section title="Contact">
      <p>
        Privacy questions and requests: <MailLink subject="Privacy request" />.
      </p>
    </Section>
  </LegalPage>
);

export const AccountDeletion = () => (
  <LegalPage title="Account Deletion">
    <Section title="How to delete your data">
      <p>
        This page is public. You do not need an account to read it. It explains how to delete your data from
        The Daily Score, including when you reached the app through a Meta product such as Instagram.
      </p>
      <p>If you can sign in, delete the account yourself:</p>
      <ol className="list-decimal space-y-space-xs pl-space-lg">
        <li>Sign in at https://thedailyscore.site or open the iOS app.</li>
        <li>Open Profile.</li>
        <li>Open Settings.</li>
        <li>Choose Export CSV first if you want a copy of your scores.</li>
        <li>Choose Delete Profile.</li>
        <li>Confirm Delete account.</li>
      </ol>
      <p>
        Deletion runs immediately and cannot be undone. You are signed out, and the same email and handle can be used
        on a new account afterward.
      </p>
    </Section>
    <Section title="What deletion removes">
      <ul className="list-disc space-y-space-xs pl-space-lg">
        <li>Your account: email, handle, display name, password hash, and any Google or Apple link.</li>
        <li>Your portrait address, timezone, game choices, and notification and night-mode settings.</li>
        <li>Your filed scores and the original pastes.</li>
        <li>Friend requests and friendships, in both directions.</li>
        <li>Device tokens used for notifications.</li>
        <li>Game requests you filed.</li>
        <li>Your session.</li>
      </ul>
      <p>
        If an older group still names you as its only member, that group is removed. If other members remain, the
        group is handed to the member who joined first. Groups are not part of the current product.
      </p>
    </Section>
    <Section title="What deletion does not remove">
      <ul className="list-disc space-y-space-xs pl-space-lg">
        <li>Your Google account, your Apple Account, or your Instagram account.</li>
        <li>An Instagram story you already posted. Delete that story in Instagram.</li>
        <li>Copies of a score or a name that another person has saved or screenshotted.</li>
        <li>Routine backups and operational logs, until those copies expire.</li>
      </ul>
      <p>
        The account row that points at your portrait is removed. If a portrait file is still in storage and you want
        it removed by hand, say so in the email below.
      </p>
    </Section>
    <Section title="Ask us to delete it">
      <p>
        If you cannot sign in, email <MailLink subject="Delete my account">williamwildernash@gmail.com</MailLink> from
        the address on the account. Use the subject “Delete my account” and include your handle. We will delete the
        account and the data listed above, then reply when it is done. We may ask you to confirm that you control the
        email before we delete it.
      </p>
      <p>
        The same address works if you used Google or Apple to sign in, or if you only shared a story to Instagram and
        want any Daily Score data removed.
      </p>
    </Section>
    <Section title="Instagram and Meta">
      <p>
        Share to Instagram creates an image on your device and hands it to the Instagram app. The Daily Score does not
        receive your Instagram or Facebook user id from that share, and it does not store a Meta account on your
        profile. To remove Daily Score data, use the steps on this page. To remove a story, use Instagram’s own
        deletion controls.
      </p>
    </Section>
  </LegalPage>
);

export const Support = () => (
  <LegalPage title="Support">
    <p>
      If you have any issues, email <MailLink />.
    </p>
    <p>
      To delete your account and the data stored with it, follow{' '}
      <Link to="/account-deletion" className={linkClass}>Account Deletion</Link>.
    </p>
  </LegalPage>
);
