// Original FlowSync reflections, bundled locally for offline use.
const quotes = [
  'One small step is still a step forward.',
  'Give your attention to the next thing you can change.',
  'A little progress today is a kindness to your future self.',
  'Make room for steady effort and a little patience.',
  'You can begin again with the next small action.',
  'Choose one thing that matters, and give it your care.',
  'Progress has room for pauses.',
  'Small promises kept build quiet confidence.',
  'Let your pace be one you can return to tomorrow.',
  'Start where you are. Work with what you have today.',
  'A clear next step can turn intention into momentum.',
  'Your best effort can look different from day to day.',
  'Leave a little space to notice how far you have come.',
  'Focus on the step in front of you. The path will follow.',
]

export function getDailyQuote(date = new Date()): string {
  // Use local calendar fields, so the quote changes at local midnight, including DST.
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000)
  return quotes[((day % quotes.length) + quotes.length) % quotes.length]
}
