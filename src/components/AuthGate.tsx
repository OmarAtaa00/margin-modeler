import {
  useState
} from 'react';

import type {
  FormEvent,
  ReactNode
} from 'react';

import { useUser } from '../contexts/UserContext';
import { supabase } from '../supabaseClient';

import './AuthGate.css';

type AuthMode =
  | 'sign-in'
  | 'sign-up'
  | 'forgot-password';

type FeedbackMessage = {
  type: 'success' | 'error';
  message: string;
};

type AuthGateProps = {
  children: ReactNode;
};

const getErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return fallback;
};

export default function AuthGate({
  children
}: AuthGateProps) {
  const { session, loading: sessionLoading } =
    useUser();

  const [mode, setMode] =
    useState<AuthMode>('sign-in');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [feedback, setFeedback] =
    useState<FeedbackMessage | null>(null);

  const supabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  const changeMode = (
    nextMode: AuthMode
  ) => {
    setMode(nextMode);
    setFeedback(null);
    setPassword('');
    setShowPassword(false);
  };

  const validateCredentials = (): boolean => {
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setFeedback({
        type: 'error',
        message: 'Enter your email address.'
      });

      return false;
    }

    if (
      mode !== 'forgot-password' &&
      password.length < 6
    ) {
      setFeedback({
        type: 'error',
        message:
          'Password must contain at least 6 characters.'
      });

      return false;
    }

    return true;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!supabaseConfigured) {
      setFeedback({
        type: 'error',
        message:
          'Authentication is not configured. Add the Supabase environment variables and restart the application.'
      });

      return;
    }

    if (!validateCredentials()) {
      return;
    }

    setProcessing(true);
    setFeedback(null);

    const cleanEmail =
      email.trim().toLowerCase();

    try {
      if (mode === 'sign-in') {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password
          });

        if (error) {
          throw error;
        }

        return;
      }

      if (mode === 'sign-up') {
        const {
          data,
          error
        } = await supabase.auth.signUp({
          email: cleanEmail,
          password
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setFeedback({
            type: 'success',
            message:
              'Your account was created successfully. You are now signed in.'
          });
        } else {
          setFeedback({
            type: 'success',
            message:
              'Account created. Check your email and confirm your address before signing in.'
          });

          setMode('sign-in');
          setPassword('');
        }

        return;
      }

      const redirectTo =
        `${window.location.origin}/`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo
          }
        );

      if (error) {
        throw error;
      }

      setFeedback({
        type: 'success',
        message:
          'If an account exists for this email address, a password-reset link has been sent.'
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: getErrorMessage(
          error,
          'Authentication failed. Please try again.'
        )
      });
    } finally {
      setProcessing(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="auth-loading-page">
        <div className="auth-loading-mark">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>

        <p>Loading your workspace...</p>
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }

  const isForgotPassword =
    mode === 'forgot-password';

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="auth-brand">
            <span className="auth-brand-mark">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </span>

            <span>Margin Modeler</span>
          </div>

          <div className="auth-brand-message">
            <span className="auth-eyebrow">
              Project scenario planning
            </span>

            <h1>
              Model resources, pricing, and margin
              outcomes with confidence.
            </h1>

            <p>
              Build project scenarios, compare staffing
              plans, manage schedules, and understand the
              financial impact before making a commitment.
            </p>
          </div>

          <div className="auth-feature-list">
            <div className="auth-feature">
              <span className="auth-feature-icon">
                01
              </span>

              <div>
                <strong>
                  Compare project scenarios
                </strong>

                <span>
                  Evaluate cost, revenue, hours, and
                  margin against a selected base plan.
                </span>
              </div>
            </div>

            <div className="auth-feature">
              <span className="auth-feature-icon">
                02
              </span>

              <div>
                <strong>
                  Plan resource assignments
                </strong>

                <span>
                  Coordinate dates, allocation, direct
                  hours, and rates in one workspace.
                </span>
              </div>
            </div>

            <div className="auth-feature">
              <span className="auth-feature-icon">
                03
              </span>

              <div>
                <strong>
                  Keep work synchronized
                </strong>

                <span>
                  Access authenticated cloud persistence
                  with a browser recovery copy.
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-brand-decoration auth-brand-decoration-one" />
        <div className="auth-brand-decoration auth-brand-decoration-two" />
      </section>

      <section className="auth-form-panel">
        <div className="auth-mobile-brand">
          <span className="auth-mobile-brand-mark">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </span>

          <span>Margin Modeler</span>
        </div>

        <div className="auth-card">
          <div className="auth-card-heading">
            <span className="auth-card-eyebrow">
              Secure workspace
            </span>

            <h2>
              {isForgotPassword
                ? 'Reset your password'
                : mode === 'sign-up'
                  ? 'Create your account'
                  : 'Welcome back'}
            </h2>

            <p>
              {isForgotPassword
                ? 'Enter your email address and a password-reset link will be sent to you.'
                : mode === 'sign-up'
                  ? 'Create an account to save and manage your project scenarios.'
                  : 'Sign in to continue working with your project scenarios.'}
            </p>
          </div>

          {!isForgotPassword && (
            <div
              className="auth-mode-switch"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={
                  mode === 'sign-in'
                }
                className={
                  mode === 'sign-in'
                    ? 'auth-mode-button active'
                    : 'auth-mode-button'
                }
                onClick={() =>
                  changeMode('sign-in')
                }
                disabled={processing}
              >
                Sign in
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={
                  mode === 'sign-up'
                }
                className={
                  mode === 'sign-up'
                    ? 'auth-mode-button active'
                    : 'auth-mode-button'
                }
                onClick={() =>
                  changeMode('sign-up')
                }
                disabled={processing}
              >
                Create account
              </button>
            </div>
          )}

          {!supabaseConfigured && (
            <div
              className="auth-feedback error"
              role="alert"
            >
              Authentication is not configured. Add
              `VITE_SUPABASE_URL` and
              `VITE_SUPABASE_ANON_KEY`, then restart
              the application.
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >
            <div className="auth-field">
              <label htmlFor="auth-email">
                Email address
              </label>

              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="name@company.com"
                autoComplete="email"
                inputMode="email"
                required
                disabled={processing}
              />
            </div>

            {!isForgotPassword && (
              <div className="auth-field">
                <div className="auth-field-heading">
                  <label htmlFor="auth-password">
                    Password
                  </label>

                  {mode === 'sign-in' && (
                    <button
                      type="button"
                      className="auth-text-button"
                      onClick={() =>
                        changeMode(
                          'forgot-password'
                        )
                      }
                      disabled={processing}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <div className="auth-password-field">
                  <input
                    id="auth-password"
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value
                      )
                    }
                    placeholder={
                      mode === 'sign-up'
                        ? 'Create a secure password'
                        : 'Enter your password'
                    }
                    autoComplete={
                      mode === 'sign-up'
                        ? 'new-password'
                        : 'current-password'
                    }
                    minLength={6}
                    required
                    disabled={processing}
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current
                      )
                    }
                    aria-label={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                    aria-pressed={showPassword}
                    disabled={processing}
                  >
                    {showPassword
                      ? 'Hide'
                      : 'Show'}
                  </button>
                </div>

                {mode === 'sign-up' && (
                  <span className="auth-field-help">
                    Use at least 6 characters.
                  </span>
                )}
              </div>
            )}

            {feedback && (
              <div
                className={`auth-feedback ${feedback.type}`}
                role={
                  feedback.type === 'error'
                    ? 'alert'
                    : 'status'
                }
                aria-live="polite"
              >
                {feedback.message}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={
                processing ||
                !supabaseConfigured
              }
            >
              {processing ? (
                <>
                  <span
                    className="auth-spinner"
                    aria-hidden="true"
                  />

                  Processing...
                </>
              ) : isForgotPassword ? (
                'Send reset link'
              ) : mode === 'sign-up' ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>

            {isForgotPassword && (
              <button
                type="button"
                className="auth-back-button"
                onClick={() =>
                  changeMode('sign-in')
                }
                disabled={processing}
              >
                Back to sign in
              </button>
            )}
          </form>

          <p className="auth-privacy-note">
            Workspace access is protected through
            Supabase Authentication. Do not enter
            confidential employer data unless the
            deployment has received the required
            security and compliance approval.
          </p>
        </div>
      </section>
    </main>
  );
}