import { SUPPORTED_LANGUAGES, type Language } from "@/lib/i18nShared";

export default function LanguageSwitchForm({
  lang,
  label,
  size = "md",
  submitLabel,
  hideLabel = false,
}: {
  lang: Language;
  label: string;
  size?: "sm" | "md";
  submitLabel?: string;
  hideLabel?: boolean;
}) {
  const selectClass =
    size === "sm"
      ? "h-9 w-auto rounded-xl border border-zinc-200 bg-white px-2 py-1 text-sm"
      : "w-auto rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm";
  const submitText = submitLabel ?? "OK";
  const selectId = `lang-select-${size}-${lang}-${hideLabel ? "footer" : "profile"}`;

  return (
    <form action="/api/user/preferences/language" method="post" className="row">
      <label className={hideLabel ? "sr-only" : "small muted"} htmlFor={selectId}>
        {label}
      </label>
      <select id={selectId} name="lang" defaultValue={lang} className={selectClass}>
        {Object.entries(SUPPORTED_LANGUAGES).map(([value, data]) => (
          <option key={value} value={value}>
            {data.native}
          </option>
        ))}
      </select>
      <button className="btn btn-ghost px-3 py-2" type="submit">
        {submitText}
      </button>
    </form>
  );
}
