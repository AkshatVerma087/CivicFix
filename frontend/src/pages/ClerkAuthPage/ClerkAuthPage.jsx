import { SignIn, SignUp } from '@clerk/react';
import '../LoginPage/LoginPage.css';
import './ClerkAuthPage.css';

// Clerk's prebuilt sign-in / sign-up inside the CivicFix login layout.
// After either, Clerk sends the user to /onboarding, which forwards
// already-onboarded users to their dashboard.
export default function ClerkAuthPage({ mode }) {
  return (
    <div className="login-page">
      <div className="login-page__bg">
        <div className="login-page__bg-gradient" />
        <div className="login-page__bg-grid" />
      </div>

      <div className="clerk-auth fade-in">
        <div className="login-header">
          <div className="login-header__logo">
            <div className="login-header__logo-icon">CS</div>
            <h1 className="login-header__title">CivicFix</h1>
          </div>
          <p className="login-header__subtitle">Empowering citizens to build better communities</p>
        </div>

        {mode === 'sign-up' ? (
          <SignUp routing="path" path="/sign-up" signInUrl="/login" fallbackRedirectUrl="/onboarding" />
        ) : (
          <SignIn routing="path" path="/login" signUpUrl="/sign-up" fallbackRedirectUrl="/onboarding" />
        )}
      </div>
    </div>
  );
}
