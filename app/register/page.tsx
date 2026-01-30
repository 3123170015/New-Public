import { getRequestLanguage, t } from "@/lib/i18n";
import { flags } from "@/lib/env";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const lang = await getRequestLanguage();
  if (!flags.allowPublicSignup) {
    return (
      <div className="mx-auto max-w-md">
        <div className="card">
          <div className="text-lg font-semibold">{t(lang, "auth.register.disabledTitle")}</div>
          <div className="small muted mt-1">{t(lang, "auth.register.disabledSubtitle")}</div>
        </div>
      </div>
    );
  }

  return <RegisterForm lang={lang} />;
}
