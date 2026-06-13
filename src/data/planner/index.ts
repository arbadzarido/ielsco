export interface Question {
  id: string;
  category: "hr" | "creative" | "portfolio" | "behavioral" | "lawson";
  question: string;
  suggestedAnswer: string;
  arbaNotes?: string;
}

export interface SectionProps {
  completed: number;
  setCompleted: (id: string, value: boolean) => void;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface StoryCard {
  title: string;
  objective: string;
  challenge: string;
  action: string;
  result: string;
}