import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowRight, ShieldAlert, Stethoscope, UserRound } from "lucide-react";
import { BrandName, LogoMark } from "@/components/Logo";
import { homePathFor, useAuth } from "@/lib/auth";
import { demoAccounts } from "@/data/operations";

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={homePathFor(user.role)} replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = login(loginId, password);
    if (result.ok) navigate(homePathFor(result.user.role), { replace: true });
    else setError(result.error);
  };

  const fill = (acc: (typeof demoAccounts)[number]) => {
    setLoginId(acc.loginId);
    setPassword(acc.password);
    setError(null);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={96} />
          <h1 className="mt-5 text-5xl leading-none sm:text-6xl">
            <BrandName />
          </h1>
          <p className="mt-3 font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-nasa-red">NASA Health Command</p>
          <p className="mt-2 text-sm text-orbit-muted [text-shadow:0_1px_10px_#06080F]">Astronaut health monitoring and medical decision support</p>
        </div>

        <div className="orbit-card orbit-glow p-6 sm:p-7">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-id" className="mb-1.5 block text-xs font-medium text-orbit-muted">
                ID
              </label>
              <input
                id="login-id"
                type="text"
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="ORBIT-A01"
                className="w-full rounded-lg border border-orbit-line bg-orbit-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-orbit-dim focus:border-orbit-cyan focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-orbit-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="demo123"
                className="w-full rounded-lg border border-orbit-line bg-orbit-bg px-3.5 py-2.5 text-sm text-ink placeholder:text-orbit-dim focus:border-orbit-cyan focus:outline-none"
              />
            </div>

            {error ? (
              <p role="alert" className="flex items-start gap-2 rounded-lg border border-orbit-crit/30 bg-orbit-crit/10 px-3 py-2 text-sm text-orbit-crit">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orbit-cyan px-4 py-2.5 text-sm font-semibold tracking-tight text-ink transition hover:bg-nasa-blue-light"
            >
              Sign in to mission console
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </form>

          <div className="mt-6 border-t border-orbit-line pt-5">
            <p className="orbit-eyebrow mb-3">Demo accounts</p>
            <div className="grid gap-2.5">
              {demoAccounts.map((acc) => {
                const Icon = acc.role === "astronaut" ? UserRound : Stethoscope;
                return (
                  <button
                    key={acc.loginId}
                    type="button"
                    onClick={() => fill(acc)}
                    className="flex items-center gap-3 rounded-lg border border-orbit-line bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-orbit-cyan/40 hover:bg-orbit-cyan/5"
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg bg-orbit-cyan/10 text-orbit-cyan">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink">
                        {acc.role === "astronaut" ? "Astronaut" : "Medical Officer"}
                      </span>
                      <span className="block truncate font-mono text-xs text-orbit-muted">
                        {acc.loginId} · {acc.password}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-5 flex items-start justify-center gap-2 rounded-md bg-[#06080F]/80 px-3 py-2 text-center text-xs text-orbit-muted backdrop-blur-sm">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Demo authentication for prototype purposes only. All data is simulated.
        </p>
      </div>
    </div>
  );
}
