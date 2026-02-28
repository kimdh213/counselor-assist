'use client';

interface SourceMeta {
  id: string;
  title: string;
}

interface AnswerCardsProps {
  content: string;
  nAnswers: number;
  sourceMeta: SourceMeta[];
  isStreaming: boolean;
}

function parseAnswers(content: string, nAnswers: number): string[] {
  if (nAnswers <= 1) return [content];

  const answers: string[] = [];
  const pattern = /\[추천답변\s*(\d+)\]/g;
  const matches = [...content.matchAll(pattern)];

  if (matches.length === 0) {
    // Not yet parsed into sections, show as single block
    return [content];
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : content.length;
    answers.push(content.slice(start, end).trim());
  }

  return answers;
}

const rankColors = [
  'border-indigo-300 bg-indigo-50/50',
  'border-emerald-300 bg-emerald-50/50',
  'border-amber-300 bg-amber-50/50',
];

const rankBadgeColors = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-amber-600',
];

export default function AnswerCards({ content, nAnswers, sourceMeta, isStreaming }: AnswerCardsProps) {
  const answers = parseAnswers(content, nAnswers);
  const showAsCards = nAnswers > 1 && answers.length > 0;

  if (!showAsCards) {
    // Single answer - show as normal chat bubble
    return (
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed text-slate-800">
        <div className="chat-content whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5 animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      {answers.map((answer, i) => (
        <div
          key={i}
          className={`border rounded-xl p-4 transition-all ${rankColors[i] || rankColors[0]}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${rankBadgeColors[i] || rankBadgeColors[0]}`}>
              추천 {i + 1}
            </span>
            {sourceMeta[i] && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                {sourceMeta[i].title}
              </span>
            )}
          </div>
          <div className="chat-content whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {answer}
            {isStreaming && i === answers.length - 1 && (
              <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5 animate-pulse" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
