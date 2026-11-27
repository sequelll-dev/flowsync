import { getDailyQuote } from '../../utils/dailyQuote'

export function DailyQuote({ date }: { date: Date }) {
  return (
    <figure className="daily-quote" aria-label="Daily motivational quote">
      <figcaption>Today's perspective</figcaption>
      <blockquote>
        <p>“{getDailyQuote(date)}”</p>
      </blockquote>
    </figure>
  )
}
