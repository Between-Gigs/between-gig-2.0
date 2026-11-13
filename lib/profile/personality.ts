/*
 * The personality question (Justin, 13 Nov 2026): instead of "What's always in your kit?", the Gigster picks one of
 * these four and answers it. The answer is ProfileFields.personality; the pick is ProfileFields.personalityQuestion.
 */
export const personalityQuestions = [
  { id: "bucket-list", text: "What's one thing on your bucket list?" },
  { id: "quiet-skill", text: "What's a skill you don't brag about?" },
  { id: "never-guess", text: "What's something people would never guess about you?" },
  { id: "unexpected-ask", text: "What's the most unexpected thing you've been asked to do on a production?" },
] as const;

export type PersonalityQuestionId = (typeof personalityQuestions)[number]["id"];

/** The question's words, or "" for an unknown id (an older answer saved without one). */
export function personalityQuestionText(id: string | undefined): string {
  return personalityQuestions.find((q) => q.id === id)?.text ?? "";
}
