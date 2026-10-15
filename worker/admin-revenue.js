export async function adminRevenue(env) {
  if (!env.DB) return [];
  const { results } = await env.DB.prepare(`
    WITH paid_orders AS (
      SELECT amount, date(COALESCE(paid_at, completed_at, created_at), '+7 hours') AS paid_date
      FROM orders WHERE status IN ('paid', 'completed')
    ), periods AS (
      SELECT 'today' AS period, date('now', '+7 hours') AS start_date
      UNION ALL SELECT 'month', date('now', '+7 hours', 'start of month')
      UNION ALL SELECT 'total', NULL
    )
    SELECT periods.period, COUNT(paid_orders.amount) AS orders,
      COALESCE(SUM(paid_orders.amount), 0) AS amount
    FROM periods LEFT JOIN paid_orders ON periods.start_date IS NULL
      OR (paid_orders.paid_date >= periods.start_date AND paid_orders.paid_date <= date('now', '+7 hours'))
    GROUP BY periods.period
  `).all();
  return results || [];
}
