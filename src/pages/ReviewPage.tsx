import { useState, useMemo } from 'react';
import { Search, Sparkles, TrendingUp, Target, Lightbulb, ArrowUpCircle, AlertTriangle, History, Clock, Play } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { loadDayCanvases } from '@/services/storage';
import { naturalLanguageSearch } from '@/services/aiService';
import type { InsightRange } from '@/types/models';
import { getDateKey } from '@/types/models';

const RANGE_CONFIG: { value: InsightRange; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季' },
  { value: 'year', label: '年' },
];

export function ReviewPage() {
  const { state, generateInsight, setInsightRange, loadInsightCaches } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ReturnType<typeof naturalLanguageSearch>>([]);
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [insightDate, setInsightDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  const [lastRunInfo, setLastRunInfo] = useState<string | null>(null);

  const allCanvases = useMemo(() => loadDayCanvases(), []);
  const totalEntries = allCanvases.reduce((s, c) => s + c.entries.length, 0);
  const activeDays = allCanvases.filter((c) => c.entries.length > 0).length;
  const insightCaches = useMemo(() => loadInsightCaches(), [state.insight]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setTimeout(() => {
      const results = naturalLanguageSearch(searchQuery, allCanvases);
      setSearchResults(results);
      setSearching(false);
    }, 300);
  };

  const handleGenerateInsight = async (range: InsightRange, date?: Date) => {
    setInsightRange(range);
    setGenerating(true);
    try {
      await generateInsight(range, date);
    } finally {
      setGenerating(false);
    }
  };

  const insight = state.insight;
  const sortedCaches = [...insightCaches].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

  return (
    <div className="review-page">
      {/* Stats Cards */}
      <div className="review-stats">
        <div className="stat-card">
          <span className="stat-number">{totalEntries}</span>
          <span className="stat-label">总记录</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{activeDays}</span>
          <span className="stat-label">活跃天数</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{insightCaches.length}</span>
          <span className="stat-label">洞察数</span>
        </div>
      </div>

      {/* AI Search */}
      <div className="review-search">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            placeholder="搜索日记内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} disabled={searching}>
            {searching ? '...' : '搜索'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>找到 {searchResults.length} 条结果</h4>
          {searchResults.map((result, idx) => {
            const cell = state.currentTemplate.cells.find((c) => c.cellId === result.cellId);
            return (
              <div key={idx} className="search-result-item">
                <div className="result-meta">
                  <span className="result-date">{result.date}</span>
                  <span className="result-cell">{cell?.emoji} {cell?.name}</span>
                </div>
                <div className="result-text">{result.text.slice(0, 100)}...</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Insight Runner */}
      <div className="insight-range-section">
        <div className="insight-range-header">
          <span className="insight-range-label"><Sparkles size={14} /> AI 洞察</span>
          <button className="insight-history-btn" onClick={() => setShowHistory(!showHistory)}>
            <History size={13} />{showHistory ? '收起' : '历史'}
          </button>
        </div>

        {/* Range + Date + Run button */}
        <div className="insight-runner">
          {/* Dimension selector */}
          <div className="insight-dimension-tabs">
            {RANGE_CONFIG.map((range) => (
              <button
                key={range.value}
                className={`insight-dimension-tab ${state.insightRange === range.value ? 'active' : ''}`}
                onClick={() => setInsightRange(range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Date picker + Run */}
          <div className="insight-run-row">
            <input
              type="date"
              className="insight-date-input"
              value={getDateKey(insightDate)}
              onChange={(e) => setInsightDate(new Date(e.target.value + 'T00:00:00'))}
            />
            <button
              className="insight-run-btn"
              onClick={() => {
                setLastRunInfo(`${getGranularityLabel(state.insightRange)} · ${insightDate.toLocaleDateString('zh-CN')}`);
                handleGenerateInsight(state.insightRange, insightDate);
              }}
              disabled={generating || !state.settings.apiKey}
            >
              {generating ? (
                <span className="insight-loading">◌</span>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  运行洞察
                </>
              )}
            </button>
          </div>

          {!state.settings.apiKey && (
            <p className="insight-warn">请在设置中配置 API Key 后使用洞察功能</p>
          )}
          {lastRunInfo && !generating && (
            <p className="insight-last-run">上次运行：{lastRunInfo}</p>
          )}
        </div>
      </div>

      {/* Insight History */}
      {showHistory && sortedCaches.length > 0 && (
        <div className="insight-history">
          <h4>历史洞察 ({sortedCaches.length})</h4>
          {sortedCaches.map((cache) => (
            <div key={cache.id} className="insight-history-item">
              <div className="insight-history-info">
                <span className="insight-history-granularity">{getGranularityLabel(cache.granularity)}</span>
                <span className="insight-history-date">{cache.periodStart}</span>
              </div>
              <div className="insight-history-time">
                <Clock size={11} />{new Date(cache.generatedAt).toLocaleDateString('zh-CN')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insight Card */}
      {insight && (
        <div className="insight-card">
          <div className="insight-header">
            <div className="insight-period">
              <Sparkles size={14} />
              <span>{insight.periodLabel}</span>
            </div>
            <span className="insight-badge">🤖 AI 生成</span>
          </div>

          {/* Summary */}
          <div className="insight-summary">{insight.summary}</div>

          {/* Grid Breakdown */}
          {insight.gridBreakdown.length > 0 && (
            <div className="insight-grid-stats">
              {insight.gridBreakdown.map((g) => (
                <div key={g.cellId} className="grid-stat-item">
                  <span className="grid-stat-emoji">{g.cellEmoji}</span>
                  <div className="grid-stat-info">
                    <span className="grid-stat-name">{g.cellName}</span>
                    <span className="grid-stat-count">{g.count} 条</span>
                  </div>
                  <div className="grid-stat-themes">
                    {g.topThemes.slice(0, 2).map((t) => (
                      <span key={t} className="grid-stat-theme">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Highlights */}
          {insight.highlights.length > 0 && (
            <div className="insight-item">
              <div className="insight-icon" style={{ background: 'var(--success)15', color: 'var(--success)' }}>
                <TrendingUp size={16} />
              </div>
              <div>
                <h5>亮点</h5>
                <ul className="insight-list">
                  {insight.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Emotion Trend */}
          <div className="insight-item">
            <div className="insight-icon" style={{ background: 'var(--primary)15', color: 'var(--primary)' }}>
              <Target size={16} />
            </div>
            <div>
              <h5>情绪趋势</h5>
              <p>{insight.emotionTrend}</p>
            </div>
          </div>

          {/* Growth Areas */}
          {insight.growthAreas.length > 0 && (
            <div className="insight-item">
              <div className="insight-icon" style={{ background: '#22C55E15', color: '#22C55E' }}>
                <Lightbulb size={16} />
              </div>
              <div>
                <h5>成长领域</h5>
                <div className="insight-tags">
                  {insight.growthAreas.map((g) => (
                    <span key={g} className="insight-tag success">{g}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Challenges */}
          {insight.challenges.length > 0 && (
            <div className="insight-item">
              <div className="insight-icon" style={{ background: 'var(--warning)15', color: 'var(--warning)' }}>
                <AlertTriangle size={16} />
              </div>
              <div>
                <h5>待改进</h5>
                <ul className="insight-list">
                  {insight.challenges.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Action Items */}
          {insight.actionItems.length > 0 && (
            <div className="insight-item">
              <div className="insight-icon" style={{ background: 'var(--primary)15', color: 'var(--primary)' }}>
                <ArrowUpCircle size={16} />
              </div>
              <div>
                <h5>行动建议</h5>
                <div className="insight-actions-list">
                  {insight.actionItems.map((a, i) => (
                    <div key={i} className="insight-action-item">
                      <span className="action-num">{i + 1}</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="insight-footer">
            <span>生成于 {new Date(insight.generatedAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getGranularityLabel(g: string): string {
  const map: Record<string, string> = { day: '日', week: '周', month: '月', quarter: '季', year: '年' };
  return map[g] || g;
}
