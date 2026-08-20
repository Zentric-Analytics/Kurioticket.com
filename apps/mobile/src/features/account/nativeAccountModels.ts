export type FaqItem = { question: string; answer: string };
export function uniqueFaqs(items: FaqItem[]) {
  const seen = new Set<string>();
  return items.filter(({ question }) => { const key = question.trim().toLocaleLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; });
}
export function filterFaqs(items: FaqItem[], query: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return normalized ? uniqueFaqs(items).filter(item => `${item.question} ${item.answer}`.toLocaleLowerCase().includes(normalized)) : uniqueFaqs(items);
}
export function toggleExpanded(current: string | null, question: string) { return current === question ? null : question; }
export function faqAccessibility(expanded: string | null, question: string) { return { expanded: expanded === question }; }

export type SupportDraft = { email: string; subject: string; category: string; body: string; ownedEmail: boolean };
export function supportDraft(email = "", ownedEmail = false): SupportDraft { return { email, ownedEmail, subject: "", category: "search-help", body: "" }; }
export function supportErrors(value: SupportDraft) { return { email: !/^\S+@\S+\.\S+$/.test(value.email), subject: value.subject.trim().length < 4 || value.subject.trim().length > 160, category: !["search-help", "price-alerts", "redirect", "account"].includes(value.category), body: value.body.trim().length < 20 || value.body.trim().length > 4000 }; }
export function canSubmitSupport(value: SupportDraft, submitting: boolean) { return !submitting && !Object.values(supportErrors(value)).some(Boolean); }

export type AsyncDraft<T> = { loading: boolean; saving: boolean; saved: T; draft: T; editVersion: number; requestVersion: number; error: string };
export function initialAsyncDraft<T>(value: T): AsyncDraft<T> { return { loading: true, saving: false, saved: value, draft: value, editVersion: 0, requestVersion: 0, error: "" }; }
export function editDraft<T>(state: AsyncDraft<T>, draft: T) { return { ...state, draft, editVersion: state.editVersion + 1 };
}
export function isDirty<T>(state: AsyncDraft<T>) { return JSON.stringify(state.draft) !== JSON.stringify(state.saved); }
export function beginLoad<T>(state: AsyncDraft<T>) { return { state: { ...state, loading: true, requestVersion: state.requestVersion + 1 }, token: state.requestVersion + 1, editVersion: state.editVersion }; }
export function finishLoad<T>(state: AsyncDraft<T>, token: number, editVersion: number, value: T) { return token === state.requestVersion && editVersion === state.editVersion ? { ...state, loading: false, saved: value, draft: value } : { ...state, loading: false }; }
export function beginSave<T>(state: AsyncDraft<T>) { return state.saving || !isDirty(state) ? null : { state: { ...state, saving: true, requestVersion: state.requestVersion + 1 }, token: state.requestVersion + 1, value: state.draft }; }
export function finishSave<T>(state: AsyncDraft<T>, token: number, value: T) { return token === state.requestVersion ? { ...state, saving: false, saved: value, draft: value, error: "" } : state; }
export function failSave<T>(state: AsyncDraft<T>, token: number, error: string) { return token === state.requestVersion ? { ...state, saving: false, error } : state; }
export function filterOptions<T>(items: readonly T[], query: string, text: (item: T) => string) { const q = query.trim().toLowerCase(); return q ? items.filter(item => text(item).toLowerCase().includes(q)) : [...items]; }
export function addAirline(values: string[], code: string) { return values.includes(code) || values.length >= 10 ? values : [...values, code]; }
