const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function nextDateStr(d) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + 1);
  return nd.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Supabase 환경변수가 설정되지 않았습니다' });
  }

  const { type, date, start, end } = req.query;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
  };

  let endpoint;
  switch (type) {
    case 'flow':
      endpoint = 'steam_flow_rate?order=data_time.desc&limit=1';
      break;
    case 'rolling':
      endpoint = 'steam_rolling_hourly';
      break;
    case 'hourly':
      if (!date) return res.status(400).json({ error: 'date 파라미터 필요' });
      endpoint = `steam_hourly?hour=gte.${date}T00:00:00&hour=lt.${nextDateStr(date)}T00:00:00&order=hour`;
      break;
    case 'daily':
      if (!start || !end) return res.status(400).json({ error: 'start, end 파라미터 필요' });
      endpoint = `steam_daily?date=gte.${start}&date=lte.${end}&order=date`;
      break;
    default:
      return res.status(400).json({ error: '유효하지 않은 type' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { headers });
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
