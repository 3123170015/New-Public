import { getRequestLanguage } from "@/lib/i18n";
import { flags } from "@/lib/env";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const lang = await getRequestLanguage();
  return <LoginForm lang={lang} allowSignup={flags.allowPublicSignup} />;
}
