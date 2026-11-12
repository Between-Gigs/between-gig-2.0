const signupSteps = [
  ["Create your account", "Choose the name clients will see on your profile."],
  ["Fill in your page", "Add your photo, services, area and availability. It saves as you go."],
  ["Send it for review", "Our team reviews your profile and emails you when it’s live."],
];

const loginSteps = [
  ["Log in to your account", "Use the same sign-in method you joined with."],
  ["Open your profile", "Pick up where you left off or update your availability."],
  ["Review your changes", "See how your page will appear to clients."],
];

/** The November 5 Crisp modern design pairs a compact form with a three-row onboarding checklist. */
export function ModernWelcome({ login = false, eyebrow, showSteps = true }: { login?: boolean; eyebrow?: string; showSteps?: boolean }) {
  return (
    <aside className="modern-auth-welcome" aria-label="Welcome to Between Gigs">
      <div className="modern-auth-intro">
        <p className="modern-auth-context">{eyebrow ?? (login ? "Welcome back" : "Gigster account")}</p>
        <p className="modern-auth-headline">Your craft.<br /><span>More possibilities.</span></p>
        <p className="modern-auth-summary">{login
          ? "Your page is right where you left it. Log in to keep it current."
          : "Bring the work you already have. Create your account, then fill in your page right where clients will see it."}</p>
      </div>
      {showSteps && (
        <ol className="modern-auth-steps" aria-label={login ? "Returning to your profile" : "Three steps to your Gigster profile"}>
          {(login ? loginSteps : signupSteps).map(([title, description], index) => (
            <li key={title} aria-current={index === 0 ? "step" : undefined}>
              <span className="modern-auth-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div><p className="modern-auth-step-title">{title}</p><p className="modern-auth-step-detail">{description}</p></div>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
