export async function adminRevenue(env) {
  if (!env.DB) return [];
  const query = (includeDeletedColumn) => env.DB.prepare(`
    WITH paid_orders AS (
      SELECT amount, date(COALESCE(paid_at, completed_at, created_at), '+7 hours') AS paid_date
      FROM orders WHERE status IN ('paid', 'completed')
        AND expired_at IS NULL
        ${includeDeletedColumn ? 'AND admin_deleted_at IS NULL' : ''}
        AND NOT EXISTS (SELECT 1 FROM settings WHERE key = 'admin_deleted_order:' || orders.code)
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
    UNION ALL
    SELECT 'month:' || substr(paid_date, 1, 7) AS period, COUNT(*), COALESCE(SUM(amount), 0)
    FROM paid_orders WHERE paid_date IS NOT NULL
    GROUP BY substr(paid_date, 1, 7)
    ORDER BY period DESC
  `).all();
  let results;
  try {
    ({ results } = await query(true));
  } catch (error) {
    if (!/no such column:\s*(?:orders\.)?admin_deleted_at\b/i.test(String(error?.message || ""))) throw error;
    ({ results } = await query(false));
  }
  return results || [];
}
