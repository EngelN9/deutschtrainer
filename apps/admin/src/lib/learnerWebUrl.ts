export const fallbackLearnerWebUrl = "https://deutschtrainer-engeln9-web.onrender.com";

export function getLearnerWebUrl(): string {
  return process.env.NEXT_PUBLIC_LEARNER_WEB_URL?.trim() || fallbackLearnerWebUrl;
}
