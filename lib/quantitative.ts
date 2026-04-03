/**
 * 定量分析库 - 移植自 fund-advisor skill
 * 
 * 核心计算函数：
 * - 收益率、波动率、夏普比率
 * - 最大回撤、Calmar 比率
 * - 估值百分位、移动平均
 * - 买卖信号评分
 */

export interface FundHistory {
  date: string
  netValue: number
  dayGrowth: number
}

export interface SignalFactors {
  valuation: { score: number; percentile: number; weight: number }
  trend: { score: number; ma20: number | null; ma60: number | null; weight: number }
  momentum: { score: number; roc20: number | null; weight: number }
  drawdown: { score: number; current: number; weight: number }
  volatility: { score: number; annualized: number; weight: number }
}

export interface SignalResult {
  totalScore: number
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'REDUCE' | 'SELL'
  factors: SignalFactors
}

export interface FundMetrics {
  annualizedReturn: number
  volatility: number
  sharpe: number
  maxDrawdown: number
  calmar: number
  winRate: number
  valuationPercentile: number
}

// ---------- 基础计算 ----------

/**
 * 计算日收益率序列
 */
export function calcDailyReturns(history: FundHistory[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < history.length; i++) {
    const prev = history[i - 1].netValue
    const curr = history[i].netValue
    if (prev > 0) {
      returns.push(curr / prev - 1)
    }
  }
  return returns
}

/**
 * 计算年化收益率
 */
export function calcAnnualizedReturn(history: FundHistory[]): number {
  if (history.length < 2) return 0
  const totalReturn = history[history.length - 1].netValue / history[0].netValue - 1
  const days = history.length
  if (days <= 0) return 0
  return Math.pow(1 + totalReturn, 252 / days) - 1
}

/**
 * 计算年化波动率
 */
export function calcVolatility(returns: number[]): number {
  if (returns.length < 2) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1)
  return Math.sqrt(variance) * Math.sqrt(252)
}

/**
 * 计算夏普比率（无风险利率默认 1.5%）
 */
export function calcSharpe(annualizedReturn: number, volatility: number, riskFree = 0.015): number {
  if (volatility === 0) return 0
  return (annualizedReturn - riskFree) / volatility
}

/**
 * 计算最大回撤及持续天数
 */
export function calcMaxDrawdown(history: FundHistory[]): { drawdown: number; duration: number } {
  if (history.length < 2) return { drawdown: 0, duration: 0 }
  
  let peak = history[0].netValue
  let maxDD = 0
  let peakIdx = 0
  let maxDDDuration = 0
  
  for (let i = 0; i < history.length; i++) {
    if (history[i].netValue > peak) {
      peak = history[i].netValue
      peakIdx = i
    }
    const dd = (history[i].netValue - peak) / peak
    if (dd < maxDD) {
      maxDD = dd
      maxDDDuration = i - peakIdx
    }
  }
  
  return { drawdown: maxDD, duration: maxDDDuration }
}

/**
 * 计算 Calmar 比率
 */
export function calcCalmar(annualizedReturn: number, maxDrawdown: number): number {
  if (maxDrawdown === 0) return 0
  return annualizedReturn / Math.abs(maxDrawdown)
}

/**
 * 计算胜率、平均盈利、平均亏损
 */
export function calcWinRate(returns: number[]): { winRate: number; avgWin: number; avgLoss: number } {
  if (returns.length === 0) return { winRate: 0, avgWin: 0, avgLoss: 0 }
  
  const wins = returns.filter(r => r > 0)
  const losses = returns.filter(r => r < 0)
  
  return {
    winRate: wins.length / returns.length,
    avgWin: wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0,
    avgLoss: losses.length > 0 ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0,
  }
}

/**
 * 计算估值百分位（当前净值在历史中的位置）
 */
export function calcValuationPercentile(history: FundHistory[]): number {
  if (history.length === 0) return 50
  const navs = history.map(h => h.netValue)
  const current = navs[navs.length - 1]
  const below = navs.filter(n => n <= current).length
  return (below / navs.length) * 100
}

/**
 * 计算移动平均线
 */
export function calcMovingAverage(history: FundHistory[], window: number): number | null {
  if (history.length < window) return null
  const slice = history.slice(-window)
  return slice.reduce((sum, h) => sum + h.netValue, 0) / window
}

/**
 * 计算 ROC（Rate of Change）动量
 */
export function calcROC(history: FundHistory[], period: number): number | null {
  if (history.length < period + 1) return null
  const current = history[history.length - 1].netValue
  const past = history[history.length - 1 - period].netValue
  return (current - past) / past * 100
}

/**
 * 计算当前回撤（从历史最高点）
 */
export function calcCurrentDrawdown(history: FundHistory[]): number {
  if (history.length === 0) return 0
  const peak = Math.max(...history.map(h => h.netValue))
  const current = history[history.length - 1].netValue
  return (current - peak) / peak * 100
}

// ---------- 综合评分 ----------

/**
 * 计算综合评分（fund-advisor 方法）
 * 
 * 权重分配：
 * - 估值: 30%
 * - 趋势: 25%
 * - 动量: 20%
 * - 回撤机会: 15%
 * - 波动率: 10%
 */
export function calcSignals(history: FundHistory[]): SignalResult {
  const RISK_FREE = 0.015
  
  // 1. 估值因子 (30%)
  const percentile = calcValuationPercentile(history)
  const valScore = Math.max(-100, Math.min(100, (50 - percentile) * 2))
  
  // 2. 趋势因子 (25%)
  const ma20 = calcMovingAverage(history, 20)
  const ma60 = calcMovingAverage(history, 60)
  const current = history[history.length - 1]?.netValue || 0
  
  let trendScore = 0
  if (ma20 && ma60) {
    if (current > ma20 && current > ma60) {
      trendScore = 50
    } else if (current > ma20) {
      trendScore = 25
    } else {
      trendScore = -50
    }
    // MA20 斜率
    if (history.length >= 25) {
      const ma20_5ago = history.slice(-25, -5).reduce((s, h) => s + h.netValue, 0) / 20
      trendScore += ma20 > ma20_5ago ? 25 : -25
    }
  }
  trendScore = Math.max(-100, Math.min(100, trendScore))
  
  // 3. 动量因子 (20%)
  const roc20 = calcROC(history, 20)
  const momentumScore = Math.max(-100, Math.min(100, (roc20 || 0) / 15 * 100))
  
  // 4. 回撤机会因子 (15%)
  const currentDD = calcCurrentDrawdown(history)
  const ddThresholds = [[-5, 20], [-10, 40], [-20, 60], [-30, 70], [-35, 50]] as const
  let ddScore = 0
  for (const [threshold, score] of ddThresholds) {
    if (currentDD <= threshold) ddScore = score
  }
  ddScore = Math.max(-100, Math.min(100, ddScore))
  
  // 5. 波动率因子 (10%)
  const returns = calcDailyReturns(history)
  const annVol = calcVolatility(returns)
  let volScore = 0
  if (annVol < 0.15) volScore = 30
  else if (annVol < 0.25) volScore = 0
  else if (annVol < 0.35) volScore = -30
  else volScore = -60
  volScore = Math.max(-100, Math.min(100, volScore))
  
  // 综合评分
  const totalScore = valScore * 0.30 + trendScore * 0.25 + momentumScore * 0.20 + ddScore * 0.15 + volScore * 0.10
  
  // 信号判定
  let signal: SignalResult['signal']
  if (totalScore >= 60) signal = 'STRONG_BUY'
  else if (totalScore >= 30) signal = 'BUY'
  else if (totalScore >= -30) signal = 'HOLD'
  else if (totalScore >= -60) signal = 'REDUCE'
  else signal = 'SELL'
  
  return {
    totalScore,
    signal,
    factors: {
      valuation: { score: valScore, percentile, weight: 0.30 },
      trend: { score: trendScore, ma20, ma60, weight: 0.25 },
      momentum: { score: momentumScore, roc20, weight: 0.20 },
      drawdown: { score: ddScore, current: currentDD, weight: 0.15 },
      volatility: { score: volScore, annualized: annVol, weight: 0.10 },
    },
  }
}

/**
 * 计算基金综合指标
 */
export function calcFundMetrics(history: FundHistory[]): FundMetrics {
  const returns = calcDailyReturns(history)
  const annualizedReturn = calcAnnualizedReturn(history)
  const volatility = calcVolatility(returns)
  const sharpe = calcSharpe(annualizedReturn, volatility)
  const { drawdown: maxDrawdown } = calcMaxDrawdown(history)
  const calmar = calcCalmar(annualizedReturn, maxDrawdown)
  const { winRate } = calcWinRate(returns)
  const valuationPercentile = calcValuationPercentile(history)
  
  return {
    annualizedReturn,
    volatility,
    sharpe,
    maxDrawdown,
    calmar,
    winRate,
    valuationPercentile,
  }
}

// ---------- 持仓诊断 ----------

/**
 * 计算两只基金的相关系数（皮尔逊）
 */
export function calcCorrelation(returns1: number[], returns2: number[]): number {
  const n = Math.min(returns1.length, returns2.length)
  if (n < 2) return 0
  
  const r1 = returns1.slice(-n)
  const r2 = returns2.slice(-n)
  
  const mean1 = r1.reduce((a, b) => a + b, 0) / n
  const mean2 = r2.reduce((a, b) => a + b, 0) / n
  
  let num = 0
  let den1 = 0
  let den2 = 0
  
  for (let i = 0; i < n; i++) {
    const d1 = r1[i] - mean1
    const d2 = r2[i] - mean2
    num += d1 * d2
    den1 += d1 * d1
    den2 += d2 * d2
  }
  
  const den = Math.sqrt(den1 * den2)
  return den === 0 ? 0 : num / den
}

/**
 * 计算分散化评分
 */
export function calcDiversificationScore(
  typeCounts: Record<string, number>,
  correlations: number[],
  fundCount: number
): { total: number; type: number; correlation: number; count: number } {
  // 类型分散度 (HHI)
  const total = Object.values(typeCounts).reduce((a, b) => a + b, 0)
  const hhi = Object.values(typeCounts).reduce((sum, c) => sum + Math.pow(c / total, 2), 0)
  const typeScore = (1 - hhi) * 100
  
  // 相关性分散度
  const avgCorr = correlations.length > 0 ? correlations.reduce((a, b) => a + b, 0) / correlations.length : 0
  const corrScore = (1 - Math.max(0, avgCorr)) * 100
  
  // 数量评分
  const countScore = Math.min(fundCount / 5 * 100, 100)
  
  // 加权总分
  const totalScore = typeScore * 0.4 + corrScore * 0.4 + countScore * 0.2
  
  return {
    total: totalScore,
    type: typeScore,
    correlation: corrScore,
    count: countScore,
  }
}

/**
 * 格式化信号为 emoji
 */
export function formatSignalEmoji(signal: SignalResult['signal']): string {
  const map: Record<SignalResult['signal'], string> = {
    STRONG_BUY: '🟢🟢 强烈买入',
    BUY: '🟢 买入',
    HOLD: '🟡 持有',
    REDUCE: '🟠 减仓',
    SELL: '🔴 卖出',
  }
  return map[signal]
}

/**
 * 格式化评分为星级
 */
export function formatScoreStars(score: number): string {
  const normalized = Math.max(0, Math.min(100, score))
  const stars = Math.round(normalized / 20)
  return '⭐'.repeat(stars) + '☆'.repeat(5 - stars)
}
