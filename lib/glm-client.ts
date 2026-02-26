/**
 * 智谱AI GLM API 客户端
 * 文档: https://open.bigmodel.cn/dev/api
 */

// GLM API 配置
const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_MODEL = 'glm-4-flash' // 快速模型，性价比高

// 消息类型
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// API 响应类型
interface GLMResponse {
  id: string
  created: number
  model: string
  choices: {
    index: number
    finish_reason: string
    message: {
      role: string
      content: string
    }
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * 调用 GLM API
 */
export async function callGLM(
  messages: ChatMessage[],
  apiKey: string,
  options: {
    temperature?: number
    maxTokens?: number
    stream?: boolean
  } = {}
): Promise<string> {
  if (!apiKey) {
    throw new Error('请先配置 GLM API Key')
  }

  const { temperature = 0.7, maxTokens = 2048 } = options

  try {
    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GLM_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GLM API 错误:', errorText)
      throw new Error(`GLM API 请求失败: ${response.status}`)
    }

    const data: GLMResponse = await response.json()
    return data.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('调用 GLM API 失败:', error)
    throw error
  }
}

/**
 * 基金分析 - 系统提示词
 */
const FUND_ANALYSIS_SYSTEM_PROMPT = `你是一位专业的基金投资分析师，擅长分析中国公募基金市场。你的职责是：

1. 分析基金组合的配置合理性
2. 评估风险收益特征
3. 提供专业的投资建议
4. 解读市场趋势和基金表现

分析时请注意：
- 使用专业的金融术语，但也要通俗易懂
- 给出具体的、可操作的建议
- 关注风险控制
- 基于提供的数据进行客观分析

请用中文回答，格式清晰，使用分点列表。`

/**
 * 分析基金组合
 */
export async function analyzeFundPortfolio(params: {
  funds: {
    code: string
    name: string
    type: string
    dayGrowth: number
    monthGrowth: number
    yearGrowth: number
    netValue: number
  }[]
  groupName?: string
  apiKey: string
}): Promise<string> {
  const { funds, groupName = '我的观察组', apiKey } = params

  // 构建基金数据摘要
  const fundSummary = funds.map(f => 
    `- ${f.name} (${f.code}): ${f.type}, 净值 ${f.netValue.toFixed(4)}, ` +
    `日涨跌 ${f.dayGrowth >= 0 ? '+' : ''}${f.dayGrowth.toFixed(2)}%, ` +
    `近一月 ${f.monthGrowth >= 0 ? '+' : ''}${f.monthGrowth.toFixed(2)}%, ` +
    `近一年 ${f.yearGrowth >= 0 ? '+' : ''}${f.yearGrowth.toFixed(2)}%`
  ).join('\n')

  // 统计数据
  const totalFunds = funds.length
  const avgDayGrowth = funds.reduce((sum, f) => sum + f.dayGrowth, 0) / totalFunds
  const avgYearGrowth = funds.reduce((sum, f) => sum + f.yearGrowth, 0) / totalFunds
  const risingCount = funds.filter(f => f.dayGrowth > 0).length
  const typeDistribution = funds.reduce((acc, f) => {
    const type = f.type.split('-')[0]
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const userPrompt = `请分析我的基金组合「${groupName}」：

## 持仓基金列表
${fundSummary}

## 组合统计
- 基金数量: ${totalFunds} 只
- 今日平均涨跌: ${avgDayGrowth >= 0 ? '+' : ''}${avgDayGrowth.toFixed(2)}%
- 年度平均收益: ${avgYearGrowth >= 0 ? '+' : ''}${avgYearGrowth.toFixed(2)}%
- 今日上涨/下跌: ${risingCount}/${totalFunds - risingCount}
- 类型分布: ${Object.entries(typeDistribution).map(([k, v]) => `${k}(${v})`).join(', ')}

请从以下角度进行分析：
1. **组合配置分析** - 类型搭配是否合理，是否有重复或缺失
2. **收益风险评估** - 近期表现如何，风险水平如何
3. **优化建议** - 是否需要调整，有什么建议
4. **市场展望** - 当前市场环境下，这组基金的预期表现`

  return callGLM([
    { role: 'system', content: FUND_ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ], apiKey)
}

/**
 * 单只基金深度分析
 */
export async function analyzeSingleFund(params: {
  code: string
  name: string
  type: string
  company: string
  netValue: number
  dayGrowth: number
  weekGrowth: number
  monthGrowth: number
  yearGrowth: number
  totalAssets: number
  apiKey: string
}): Promise<string> {
  const { apiKey, ...fund } = params

  const userPrompt = `请深度分析以下基金：

## 基金基本信息
- 名称: ${fund.name}
- 代码: ${fund.code}
- 类型: ${fund.type}
- 基金公司: ${fund.company}
- 基金规模: ${(fund.totalAssets / 100000000).toFixed(2)} 亿

## 业绩表现
- 单位净值: ¥${fund.netValue.toFixed(4)}
- 日涨跌: ${fund.dayGrowth >= 0 ? '+' : ''}${fund.dayGrowth.toFixed(2)}%
- 近一周: ${fund.weekGrowth >= 0 ? '+' : ''}${fund.weekGrowth.toFixed(2)}%
- 近一月: ${fund.monthGrowth >= 0 ? '+' : ''}${fund.monthGrowth.toFixed(2)}%
- 近一年: ${fund.yearGrowth >= 0 ? '+' : ''}${fund.yearGrowth.toFixed(2)}%

请提供：
1. **基金特点分析** - 该基金的投资风格和特点
2. **业绩评价** - 收益表现如何，与同类对比
3. **风险评估** - 潜在风险因素
4. **投资建议** - 适合什么类型的投资者，买入时机建议`

  return callGLM([
    { role: 'system', content: FUND_ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ], apiKey)
}

/**
 * 市场趋势分析
 */
export async function analyzeMarketTrend(params: {
  indexData: {
    name: string
    value: number
    change: number
  }[]
  apiKey: string
}): Promise<string> {
  const { indexData, apiKey } = params

  const indexSummary = indexData.map(i => 
    `- ${i.name}: ${i.value.toFixed(2)}, ${i.change >= 0 ? '+' : ''}${i.change.toFixed(2)}%`
  ).join('\n')

  const userPrompt = `请分析当前市场行情：

## 主要指数表现
${indexSummary}

请提供：
1. **市场整体判断** - 当前市场处于什么状态
2. **板块轮动分析** - 哪些板块表现较好/较差
3. **投资策略建议** - 当前市场下的操作建议`

  return callGLM([
    { role: 'system', content: FUND_ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ], apiKey)
}
