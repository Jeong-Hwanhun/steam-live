import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const CUSTOMERS = [
  { key: 'sc',       name: '홍덕BW(홍덕SC)', color: '#2a78d6' },
  { key: 'sw',       name: '홍덕SW',         color: '#eb6834' },
  { key: 'skw',      name: '홍덕SKW',        color: '#1baf7a' },
  { key: 'bw',       name: '홍덕BW(구선)',   color: '#556070', dormant: true },
  { key: 'ksw',      name: '고려특수선재',   color: '#9b59b6' },
  { key: 'goryeo',   name: '고려강선',       color: '#e34948' },
  { key: 'kw',       name: '코스와이어',     color: '#27ae60' },
  { key: 'union_co', name: '유니온',         color: '#eda100' },
  { key: 'hangeum',  name: '한금',           color: '#e87ba4' },
  { key: 'pgt',      name: '피지티',         color: '#5c7cfa' },
];

const apiFetch = async (params) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/steam?${qs}`);
  if (!res.ok) throw new Error(res.status);
  return res.json();
};

const nextDateStr = (d) => {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + 1);
  return nd.toISOString().split('T')[0];
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, e) => s + (Number(e.value) || 0), 0);
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '0.5px solid var(--border-strong)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 13,
    }}>
      <p style={{ margin: '0 0 8px', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</p>
      {payload.map(e => {
        const c = CUSTOMERS.find(c => c.key === e.dataKey);
        return (
          <div key={e.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, margin: '3px 0' }}>
            <span><span style={{ color: e.color }}>■ </span>{c?.name}</span>
            <strong>{Number(e.value).toFixed(3)} t</strong>
          </div>
        );
      })}
      {payload.length > 1 && (
        <div style={{
          marginTop: 8, borderTop: '0.5px solid var(--border)', paddingTop: 6,
          display: 'flex', justifyContent: 'space-between',
          fontWeight: 500, color: 'var(--text-accent)',
        }}>
          <span>합계</span>
          <span>{total.toFixed(3)} t</span>
        </div>
      )}
    </div>
  );
}

const card = {
  background: 'var(--surface-1)',
  borderRadius: 12,
  border: '0.5px solid var(--border)',
  padding: '1rem 1.25rem',
};

const todayKST = () => {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().split('T')[0];
};

const monthAgoKST = () => {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kst.setDate(kst.getDate() - 30);
  return kst.toISOString().split('T')[0];
};

export default function SteamDashboard() {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState('realtime');

  const [flow, setFlow] = useState(null);
  const [rolling, setRolling] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState(null);

  const [selectedDate, setSelectedDate] = useState(todayKST());
  const [hourlyData, setHourlyData] = useState([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);

  const [dateRange, setDateRange] = useState({ start: monthAgoKST(), end: todayKST() });
  const [dailyData, setDailyData] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  const [monthlyData, setMonthlyData] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [visible, setVisible] = useState(CUSTOMERS.map(c => c.key));

  useEffect(() => setMounted(true), []);

  const fetchRealtime = useCallback(async () => {
    try {
      setError(null);
      const [f, r] = await Promise.all([
        apiFetch({ type: 'flow' }),
        apiFetch({ type: 'rolling' }),
      ]);
      setFlow(f[0] || null);
      setRolling(r[0] || null);
      setLastUpdate(new Date());
      setCountdown(60);
    } catch (e) {
      setError('데이터 로드 실패: ' + e.message);
    }
  }, []);

  useEffect(() => {
    fetchRealtime();
    const ri = setInterval(fetchRealtime, 60000);
    const ci = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearInterval(ri); clearInterval(ci); };
  }, [fetchRealtime]);

  useEffect(() => {
    if (tab !== 'hourly') return;
    setHourlyLoading(true);
    apiFetch({ type: 'hourly', date: selectedDate })
      .then(data => setHourlyData(data.map(r => ({ ...r, label: r.hour.substring(11, 13) + '시' }))))
      .catch(() => setHourlyData([]))
      .finally(() => setHourlyLoading(false));
  }, [tab, selectedDate]);

  useEffect(() => {
    if (tab !== 'daily') return;
    setDailyLoading(true);
    apiFetch({ type: 'daily', start: dateRange.start, end: dateRange.end })
      .then(setDailyData)
      .catch(() => setDailyData([]))
      .finally(() => setDailyLoading(false));
  }, [tab, dateRange]);

  useEffect(() => {
    if (tab !== 'monthly') return;
    setMonthlyLoading(true);
    apiFetch({ type: 'monthly' })
      .then(setMonthlyData)
      .catch(() => setMonthlyData([]))
      .finally(() => setMonthlyLoading(false));
  }, [tab]);

  if (!mounted) return null;

  const totalFlow = flow
    ? CUSTOMERS.reduce((s, c) => s + (Number(flow[c.key]) || 0), 0).toFixed(1)
    : '—';
  const totalRolling = rolling
    ? CUSTOMERS.reduce((s, c) => s + (Number(rolling[c.key]) || 0), 0).toFixed(2)
    : '—';

  const isStale = flow?.data_time && Date.now() - new Date(flow.data_time) > 600000;
  const visibleList = CUSTOMERS.filter(c => visible.includes(c.key));
  const toggleCust = key => setVisible(p =>
    p.includes(key) ? p.filter(k => k !== key) : [...p, key]
  );

  const custTotal = (data, key) =>
    data.reduce((s, r) => s + (Number(r[key]) || 0), 0).toFixed(2);
  const periodTotal = (data, list) =>
    data.reduce((s, r) => s + list.reduce((ss, c) => ss + (Number(r[c.key]) || 0), 0), 0).toFixed(2);

  const pillStyle = (color, on) => ({
    padding: '4px 10px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
    border: `0.5px solid ${on ? color : 'var(--border-strong)'}`,
    background: on ? color + '22' : 'transparent',
    color: on ? color : 'var(--text-muted)',
  });

  const tabStyle = (active) => ({
    padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
    border: active ? '0.5px solid var(--text-accent)' : '0.5px solid var(--border-strong)',
    background: active ? 'rgba(96,165,250,0.1)' : 'transparent',
    color: active ? 'var(--text-accent)' : 'var(--text-secondary)',
    fontWeight: active ? 500 : 400,
  });

  const EmptyState = ({ msg }) => (
    <div style={{ ...card, padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>{msg}</div>
  );

  const SummaryBar = ({ data, list }) => (
    <div style={{
      marginTop: 16, borderTop: '0.5px solid var(--border)', paddingTop: 12,
      display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
    }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>합계</span>
      {list.map(c => (
        <span key={c.key} style={{ fontSize: 12 }}>
          <span style={{ color: c.color, fontWeight: 500 }}>{c.name}</span>
          <span style={{ color: 'var(--text-primary)', marginLeft: 3 }}> {custTotal(data, c.key)}t</span>
        </span>
      ))}
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-accent)', marginLeft: 'auto' }}>
        총 {periodTotal(data, list)}t
      </span>
    </div>
  );

  const FilterPills = () => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
      {CUSTOMERS.map(c => (
        <button key={c.key} onClick={() => toggleCust(c.key)} style={pillStyle(c.color, visible.includes(c.key))}>
          {c.name}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <Head>
        <title>스팀 판매 모니터링 | NATURE E&T</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24, paddingBottom: 20, borderBottom: '0.5px solid var(--border)',
        }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 3, marginBottom: 6, textTransform: 'uppercase' }}>
              NATURE E&T
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 500 }}>스팀 판매 모니터링</h1>
          </div>
          <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-muted)' }}>
            {lastUpdate && (
              <>
                <div>업데이트 {lastUpdate.toLocaleTimeString('ko-KR')}</div>
                <div style={{ color: countdown <= 10 ? 'var(--text-danger)' : 'var(--text-muted)', marginTop: 4 }}>
                  {countdown}초 후 갱신
                </div>
              </>
            )}
          </div>
        </div>

        {/* Banners */}
        {error && (
          <div style={{ background: 'var(--bg-danger)', border: '0.5px solid var(--border-danger)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-danger)', fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}
        {isStale && (
          <div style={{ background: 'var(--bg-warning)', border: '0.5px solid var(--border-warning)', borderRadius: 8, padding: '10px 14px', color: 'var(--text-warning)', fontSize: 13, marginBottom: 16 }}>
            10분 이상 새 데이터가 없습니다. 현장 PC EXE 실행 여부를 확인하세요.
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[['realtime','실시간'],['hourly','시간별'],['daily','일별'],['monthly','월별']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={tabStyle(tab === id)}>{label}</button>
          ))}
        </div>

        {/* ── 실시간 ── */}
        {tab === 'realtime' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={card}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>전체 분당 판매량</p>
                <p style={{ fontSize: 32, fontWeight: 500 }}>
                  {totalFlow}
                  <span style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8 }}>kg/분</span>
                </p>
              </div>
              <div style={card}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>전체 최근 1시간 판매량</p>
                <p style={{ fontSize: 32, fontWeight: 500 }}>
                  {totalRolling}
                  <span style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 400, marginLeft: 8 }}>톤</span>
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {CUSTOMERS.map(c => {
                const fv = flow ? Number(flow[c.key] || 0) : null;
                const rv = rolling ? Number(rolling[c.key] || 0) : null;
                const active = fv !== null && fv > 0;
                return (
                  <div key={c.key} className="customer-card" style={{
                    background: 'var(--surface-1)',
                    borderRadius: 12,
                    border: `0.5px solid ${active ? c.color + '44' : 'var(--border)'}`,
                    padding: '14px',
                    borderTop: `3px solid ${c.dormant ? 'var(--border-strong)' : c.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: c.dormant ? 'var(--text-muted)' : 'var(--text-primary)', marginBottom: 2, minHeight: 36 }}>
                      {c.name}
                      
                    </p>
                    <div style={{ marginTop: 10, marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>분당 판매량</p>
                      <p style={{ fontSize: 22, fontWeight: 500, color: fv === null ? 'var(--text-muted)' : (active ? c.color : 'var(--text-muted)') }}>
                        {fv === null ? '—' : fv.toFixed(1)}
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 3, fontWeight: 400 }}>kg</span>
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>최근 1시간 판매량</p>
                      <p style={{ fontSize: 19, fontWeight: 500, color: rv !== null && rv > 0 ? c.color : 'var(--text-muted)' }}>
                        {rv === null ? '—' : rv.toFixed(3)}
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>톤</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 시간별 ── */}
        {tab === 'hourly' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>날짜</label>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </div>
            </div>
            <FilterPills />
            {hourlyLoading ? <EmptyState msg="로딩 중..." /> :
              hourlyData.length === 0 ? <EmptyState msg={`${selectedDate} 데이터가 없습니다`} /> : (
              <div style={card}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  {selectedDate} 시간별 판매량 (톤/시간)
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hourlyData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} unit="t" />
                    <Tooltip content={<CustomTooltip />} />
                    {visibleList.map(c => (
                      <Bar key={c.key} dataKey={c.key} fill={c.color} stackId="stack" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <SummaryBar data={hourlyData} list={visibleList} />
              </div>
            )}
          </div>
        )}

        {/* ── 일별 ── */}
        {tab === 'daily' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>시작일</label>
                <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>종료일</label>
                <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} />
              </div>
            </div>
            <FilterPills />
            {dailyLoading ? <EmptyState msg="로딩 중..." /> :
              dailyData.length === 0 ? <EmptyState msg="선택한 기간 데이터가 없습니다" /> : (
              <div style={card}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  일별 판매량 (톤/일)
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} unit="t" />
                    <Tooltip content={<CustomTooltip />} />
                    {visibleList.map(c => (
                      <Line key={c.key} type="monotone" dataKey={c.key} stroke={c.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <SummaryBar data={dailyData} list={visibleList} />
              </div>
            )}
          </div>
        )}

        {/* ── 월별 ── */}
        {tab === 'monthly' && (
          <div>
            <FilterPills />
            {monthlyLoading ? <EmptyState msg="로딩 중..." /> :
              monthlyData.length === 0 ? <EmptyState msg="데이터가 없습니다" /> : (
              <div style={card}>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  월별 판매량 (톤/월)
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} unit="t" />
                    <Tooltip content={<CustomTooltip />} />
                    {visibleList.map(c => (
                      <Bar key={c.key} dataKey={c.key} fill={c.color} stackId="stack" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>

                {/* Monthly table */}
                <div style={{ marginTop: 20, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '0.5px solid var(--border-strong)' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 400 }}>월</th>
                        {visibleList.map(c => (
                          <th key={c.key} style={{ padding: '6px 8px', textAlign: 'right', color: c.color, fontWeight: 400 }}>{c.name}</th>
                        ))}
                        <th style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: 400 }}>합계</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((row, i) => {
                        const total = visibleList.reduce((s, c) => s + (Number(row[c.key]) || 0), 0);
                        return (
                          <tr key={i} style={{ borderBottom: '0.5px solid var(--border)', background: i % 2 !== 0 ? 'var(--surface-2)' : 'transparent' }}>
                            <td style={{ padding: '7px 8px', color: 'var(--text-secondary)', fontWeight: 500 }}>{row.month}</td>
                            {visibleList.map(c => (
                              <td key={c.key} style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--text-primary)' }}>
                                {Number(row[c.key] || 0).toFixed(2)}
                              </td>
                            ))}
                            <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--text-accent)', fontWeight: 500 }}>
                              {total.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
