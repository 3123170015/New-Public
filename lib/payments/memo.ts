export function templateMemo(template: string, depositId: string) {
  if (!template) return depositId;
  return template.replaceAll("{depositId}", depositId);
}
