import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, BookOpen, BriefcaseBusiness,
  Check, ChevronRight, CircleHelp, ExternalLink, Globe2, Landmark,
  LineChart as LineChartIcon, Newspaper, Pause, Play, Orbit, Grid2X2, Gauge,
  ShieldAlert, Sparkles, X,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import marketData from './market.json'
import historyData from './history.json'
import './App.css'

type SegmentKey = 'overall' | 'ai' | 'memory' | 'equipment' | 'mature'
type MarketKey = 'global' | 'china'

const stages = [
  {
    name: '复苏', inventory: '被动去库存', angle: -135, tone: 'sage',
    summary: '需求先回暖，库存仍在下降；价格止跌，股价往往早于利润拐点。',
    signals: ['订单与交期企稳', '产能利用率触底', '库存周转天数下降'],
    chain: ['终端需求回升', '渠道库存下降', '芯片价格止跌', '招聘降幅收窄'],
  },
  {
    name: '扩张', inventory: '主动补库存', angle: -45, tone: 'blue',
    summary: '量价齐升、稼动率上行，企业上修资本开支，岗位与薪酬开始扩张。',
    signals: ['销售额环比增长', '满产与交期拉长', '资本开支上修'],
    chain: ['补库存与真实需求共振', '量价齐升', '盈利上修', '扩产与招聘加速'],
  },
  {
    name: '过热', inventory: '被动补库存', angle: 45, tone: 'red',
    summary: '需求增速见顶，但供给仍在释放；重复下单与高估值放大回撤风险。',
    signals: ['库存重新抬头', '股价先于业绩走弱', '新产能集中投放'],
    chain: ['涨价抑制终端需求', '重复下单消失', '库存被动上升', '股价高波动'],
  },
  {
    name: '衰退', inventory: '主动去库存', angle: 135, tone: 'ink',
    summary: '订单、价格和稼动率下行，减产与削减资本开支推动供给出清。',
    signals: ['降价与减产', '库存减值增加', '招聘冻结或裁员'],
    chain: ['订单下修', '降价去库存', '削减资本开支', '供给出清后等待复苏'],
  },
]

const segments: Record<SegmentKey, {
  label: string; short: string; angle: number; phase: string; risk: string;
  title: string; description: string; evidence: string; watch: string;
}> = {
  overall: {
    label: '整体周期', short: '整体', angle: 34, phase: '扩张后段', risk: '结构性分化',
    title: '高景气扩张，但已不是同涨同跌的一条周期',
    description: '销售、先进制造与设备仍在加速，资本市场却已出现明显波动。用“扩张后段”描述整体，用不同位置描述细分赛道，比简单喊“顶峰”更准确。',
    evidence: '2026Q3 全球销售额环比 +24.1%；台积电库存天数降至 82 天。',
    watch: '下一步看销售环比能否延续、库存是否回升，以及新产能投放速度。',
  },
  ai: {
    label: 'AI 算力 / 先进逻辑', short: 'AI 算力', angle: 14, phase: '强扩张', risk: '云厂商资本开支',
    title: '真实需求强劲，先进制程与先进封装仍是瓶颈',
    description: '台积电 HPC 已占收入 68%，先进制程占晶圆收入 79%。这支持强扩张判断，但也意味着景气高度依赖云厂商 AI 投资。',
    evidence: '台积电 2026Q3 收入同比 +50.9%，HPC 收入环比 +22%。',
    watch: '跟踪云厂商资本开支、CoWoS 供给与 AI 加速器出货，而非只看 GPU 股价。',
  },
  memory: {
    label: '存储 / HBM', short: '存储 HBM', angle: 65, phase: '高景气 / 偏热', risk: '价格与扩产反转',
    title: '价格弹性最大，也最需要警惕高位扩产',
    description: 'HBM 挤占通用 DRAM 供给，存储价格与利润快速上行；美光股价区间涨幅也显著跑赢。越接近价格高位，越要同时盯供给。',
    evidence: 'SEMI 预计 2026 年 300mm 存储厂设备支出首次超过 500 亿美元。',
    watch: 'DRAM/NAND 合约价、原厂库存、HBM 产能转换与 2027 年新增供给。',
  },
  equipment: {
    label: '设备 / 先进封装', short: '设备封装', angle: 38, phase: '扩张后段', risk: '订单前置与出口限制',
    title: '订单能见度强，但今天的订单也是明天的供给',
    description: 'ASML 与 SEMI 数据确认设备周期强劲。设备是景气的确认指标，也是未来产能的领先指标，不能只做单向利好解读。',
    evidence: 'ASML 2026Q3 净销售额 €117 亿；客户订单已延伸至 2028 年。',
    watch: '新签订单、在手订单、客户资本开支，以及中国大陆收入占比变化。',
  },
  mature: {
    label: '成熟制程 / 模拟', short: '成熟模拟', angle: -28, phase: '修复扩张', risk: '终端需求不均',
    title: '从底部修复走向选择性紧缺，并非全面过热',
    description: '中芯国际高稼动率与部分 8 英寸产能收紧支持修复判断；但消费、汽车和工业需求恢复节奏不同，不能套用 AI 的景气强度。',
    evidence: '中芯国际 2026Q2 产能利用率 93.7%，Q3 指引约 95%。',
    watch: '8 英寸价格、渠道库存、汽车与工业订单，以及新增成熟产能。',
  },
}

const sourceUrls = {
  sia: 'https://www.semiconductors.org/global-semiconductor-sales-increase-24-1-from-q2-2026-to-q3-2026/',
  tsmc: 'https://investor.tsmc.com/english/encrypt/files/encrypt_file/reports/2026-10/f83780000ddc0c3b48e57a87eab6814c4ab35058/3Q26%20ManagementReport.pdf',
  asml: 'https://finance.yahoo.com/markets/stocks/articles/asml-holding-nv-asml-q3-090027829.html',
  smic: 'https://www.cls.cn/detail/2453693',
  semi: 'https://www.semimedia.cc/semi-300mm-fab-equipment-spending-to-rise-31-to-149-billion-in-2026/',
  memory: 'https://pdf.dfcfw.com/pdf/H3_AP202609081829133469_1.pdf',
  framework: 'https://pdf.dfcfw.com/pdf/H3_AP202303171584335190_1.pdf?1679062032000.pdf=',
  jobs: 'https://www.sgpjbg.com/baogao/1349626.html',
  liepin: 'https://m.sohu.com/a/1092344352_100116740/?pvid=000115_3w_a',
  salary: 'http://mp.weixin.qq.com/s?__biz=MzA3NjM1NTgzNQ==&mid=2651689925&idx=1&sn=5b3036014ec1376d0db0865366a8933d',
  wtw: 'https://www.wtwco.cn/zh-cn/insights/2025/03/2025-salary-outlook-trends-and-predictions-for-chinese-industries',
  chipwar: 'https://www.simonandschuster.com/books/Chip-War/Chris-Miller/9781982172015/',
  chip: 'http://www.publishersweekly.com/9780375758287',
  history: 'http://business.china.com.cn/2022-11/30/content_42189167.html',
}

const longTermSources = {
  annual: 'https://www.semiconductors.org/global-annual-semiconductor-sales-increase-25-6-to-791-7-billion-in-2025/',
  billings: 'https://www.semiconductors.org/resources/https-www-semiconductors-org-wp-content-uploads-2023-08-gsr1976-november-2023-xls/',
  invention: 'https://ieeexplore.ieee.org/abstract/document/6770875',
  cpi: 'https://fred.stlouisfed.org/series/CPIAUCSL',
}

const technologyEras = [
  { year: 1947, label: '晶体管', title: '第一次半导体革命', detail: '贝尔实验室发明点接触晶体管，固态电子时代开启。此时尚无可比的连续产业销售指数。', url: longTermSources.invention },
  { year: 1958, label: '集成电路', title: '从器件到集成系统', detail: '集成电路把多个元件放到同一芯片上，为后来的规模化计算奠定技术基础。', url: longTermSources.invention },
  { year: 1971, label: '微处理器', title: '计算能力进入单芯片', detail: '微处理器把 CPU 功能集成到芯片中，计算设备开始走向小型化与普及化。', url: longTermSources.invention },
  { year: 1981, label: '个人电脑', title: 'PC 打开商用与家庭需求', detail: '个人电脑成为新的需求平台，微处理器、存储器与外围芯片形成协同扩张。', url: longTermSources.billings },
  { year: 1995, label: '互联网革命', title: '网络商业化带来新一轮扩张', detail: 'PC、网络设备与服务器共同拉动芯片需求，年度销售额在 1995 年达到约 1444 亿美元。', url: longTermSources.billings },
  { year: 2001, label: '泡沫破裂', title: '互联网泡沫后的深度去库存', detail: '全球年度销售额由 2000 年约 2044 亿美元降至 2001 年约 1390 亿美元，是长周期图中最剧烈的下行之一。', url: longTermSources.billings },
  { year: 2007, label: '智能手机', title: '移动平台接棒 PC', detail: '智能手机推动移动处理器、存储、射频与传感器需求，产业增长动力从桌面转向移动终端。', url: longTermSources.billings },
  { year: 2020, label: '疫情缺芯', title: '数字化需求与供给约束共振', detail: '远程办公、消费电子与汽车芯片需求叠加供给约束，随后形成缺芯、扩产与库存调整。', url: longTermSources.billings },
  { year: 2022, label: '生成式 AI', title: 'AI 算力成为新平台周期', detail: 'GPU、HBM、先进制程与先进封装成为核心瓶颈；与此同时，传统存储和消费芯片仍经历去库存。', url: longTermSources.annual },
  { year: 2026, label: '当前', title: 'AI 扩张与结构分化并存', detail: '长期曲线截至 2025 完整年度；2026 仅作为当前阶段标记，不把未完整年度或预测值画成历史销售。', url: sourceUrls.sia },
]

const evidenceCards = [
  { value: '$517.7B', label: '全球 Q3 销售额', delta: '环比 +24.1%', source: 'SIA · 11/03', url: sourceUrls.sia },
  { value: '82 天', label: '台积电库存天数', delta: '环比减少 5 天', source: 'TSMC · 10/15', url: sourceUrls.tsmc },
  { value: '€11.7B', label: 'ASML Q3 净销售额', delta: '创季度纪录', source: 'ASML · 10/14', url: sourceUrls.asml },
  { value: '93.7%', label: '中芯国际产能利用率', delta: 'Q3 指引约 95%', source: '中芯国际 · 08/13', url: sourceUrls.smic },
]

const news = [
  { date: '11.03', tag: '产业', title: '全球芯片销售继续加速，9 月环比 +7.9%', detail: 'Q3 销售额 5177 亿美元，连续第三个季度环比增幅超过 20%。', url: sourceUrls.sia },
  { date: '10.15', tag: '制造', title: '台积电 Q3 超预期，库存天数反而下降', detail: 'HPC 占收入 68%，先进制程占晶圆收入 79%，量增并未带来库存堆积。', url: sourceUrls.tsmc },
  { date: '10.14', tag: '设备', title: 'ASML 创纪录，客户需求看到 2028 年', detail: 'Q3 净销售额 117 亿欧元，2027 年低 NA EUV 与浸没式 DUV 产能计划提升 30%。', url: sourceUrls.asml },
  { date: '10.15', tag: '产能', title: 'SEMI 上调 300mm 晶圆厂设备支出预期', detail: '2026 年预计同比增长 31% 至 1490 亿美元，扩产同时也是未来供给风险。', url: sourceUrls.semi },
  { date: '08.13', tag: '中国', title: '中芯国际高稼动率，成熟制程景气修复', detail: 'Q2 产能利用率 93.7%，资本开支 18.36 亿美元；Q3 收入指引环比 +2%—4%。', url: sourceUrls.smic },
]

const salaryTrend = [
  { year: '2021', rate: 9.0 }, { year: '2022', rate: 8.4 },
  { year: '2023', rate: 3.6 }, { year: '2024', rate: 3.0 },
  { year: '25H1', rate: 5.3 },
]
const roleSalaries = [
  { role: '数字后端', salary: 62.8 }, { role: '射频设计', salary: 62.6 },
  { role: '数字验证', salary: 60.0 }, { role: '模拟 IC', salary: 58.8 },
  { role: '良率工程', salary: 55.1 }, { role: '设备工程', salary: 47.8 },
  { role: '工艺工程', salary: 45.3 },
]

function SourceLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return <a className={`source-link ${className}`} href={href} target="_blank" rel="noreferrer">{children}<ExternalLink size={13} /></a>
}

type DialStyle = 'aurora' | 'swiss' | 'blueprint'

const dialStyleOptions = [
  { id: 'aurora' as const, name: '极光终端', icon: Orbit },
  { id: 'swiss' as const, name: '瑞士网格', icon: Grid2X2 },
  { id: 'blueprint' as const, name: '蓝图工程', icon: Gauge },
]

function CycleDial({ angle, phase, playing, style, onStyleChange }: {
  angle: number; phase: string; playing: boolean; style: DialStyle;
  onStyleChange: (style: DialStyle) => void;
}) {
  const rad = angle * Math.PI / 180
  const x = 210 + Math.cos(rad) * 141
  const y = 210 + Math.sin(rad) * 141
  return (
    <div className={`dial-wrap dial-style-${style}`}>
      <div className="dial-style-picker" aria-label="轮盘视觉模板">
        <span>轮盘模板</span>
        <div>
          {dialStyleOptions.map(option => {
            const Icon = option.icon
            return <button key={option.id} className={style === option.id ? 'active' : ''} aria-pressed={style === option.id} onClick={() => onStyleChange(option.id)}><Icon size={14} />{option.name}</button>
          })}
        </div>
      </div>
      <svg className="cycle-dial" viewBox="0 0 420 420" role="img" aria-label={`当前周期位置：${phase}；${dialStyleOptions.find(item => item.id === style)?.name}模板`}>
        <g className="dial-grid" aria-hidden="true">
          <path d="M 40 40 H 380 V 380 H 40 Z M 210 28 V 392 M 28 210 H 392" />
          <circle cx="210" cy="210" r="178" />
        </g>
        <g className="dial-ticks" aria-hidden="true">
          {Array.from({ length: 48 }, (_, index) => {
            const tickAngle = index * 7.5 * Math.PI / 180
            const inner = index % 6 === 0 ? 157 : 161
            return <line key={index} x1={210 + Math.cos(tickAngle) * inner} y1={210 + Math.sin(tickAngle) * inner} x2={210 + Math.cos(tickAngle) * 168} y2={210 + Math.sin(tickAngle) * 168} />
          })}
        </g>
        <circle cx="210" cy="210" r="141" className="dial-track" />
        <path d="M 210 69 A 141 141 0 0 1 351 210" className="arc arc-expansion" />
        <path d="M 351 210 A 141 141 0 0 1 210 351" className="arc arc-hot" />
        <path d="M 210 351 A 141 141 0 0 1 69 210" className="arc arc-down" />
        <path d="M 69 210 A 141 141 0 0 1 210 69" className="arc arc-recovery" />
        <circle cx="210" cy="210" r="105" className="dial-inner" />
        <g className="dial-orbit" aria-hidden="true"><circle cx="210" cy="210" r="88" /><path d="M 122 210 H 298 M 210 122 V 298" /></g>
        <line x1="210" y1="210" x2={x} y2={y} className={`dial-hand ${playing ? 'is-playing' : ''}`} />
        <circle cx={x} cy={y} r="13" className="dial-dot-halo" />
        <circle cx={x} cy={y} r="7" className="dial-dot" />
        <circle cx="210" cy="210" r="8" className="dial-pin" />
        <text x="210" y="39" textAnchor="middle" className="dial-label">复苏 · 被动去库</text>
        <text x="375" y="215" textAnchor="middle" className="dial-label">扩张</text>
        <text x="210" y="394" textAnchor="middle" className="dial-label">过热 · 被动补库</text>
        <text x="43" y="215" textAnchor="middle" className="dial-label">衰退</text>
      </svg>
      <div className="dial-center">
        <span>{playing ? '教学演示' : '当前定位'}</span>
        <strong>{phase}</strong>
        <small>{playing ? '不代表未来预测' : `研究判断 · ${marketData.researchUpdatedAt}`}</small>
      </div>
      <div className="dial-index" aria-hidden="true"><span>SEMICONDUCTOR</span><span>CYCLE / 04</span></div>
    </div>
  )
}

const eraStageMap: Record<number, number> = {
  1947: 0, 1958: 1, 1971: 1, 1981: 1, 1995: 1,
  2001: 3, 2007: 1, 2020: 2, 2022: 3, 2026: 1,
}

function historyStageForYear(year: number, salesMode: 'nominal' | 'real') {
  if (eraStageMap[year] !== undefined) return eraStageMap[year]
  const index = historyData.annual.findIndex(point => point.year === year)
  if (index <= 0) return 0
  const key = salesMode === 'real' ? 'realSales' : 'sales'
  const growth = (historyData.annual[index][key] / historyData.annual[index - 1][key] - 1) * 100
  if (growth <= -1.5) return 3
  if (growth < 1) return 0
  if (index > 1) {
    const previousGrowth = (historyData.annual[index - 1][key] / historyData.annual[index - 2][key] - 1) * 100
    if (previousGrowth >= 18 && previousGrowth - growth >= 15) return 2
    if (growth >= 20 && previousGrowth >= 15) return 2
  }
  return 1
}

function HistoryCycleDial({ year, stageIndex }: { year: number; stageIndex: number }) {
  const stage = stages[stageIndex]
  const angle = stage.angle
  const radians = angle * Math.PI / 180
  const x = 150 + Math.cos(radians) * 99
  const y = 150 + Math.sin(radians) * 99
  return (
    <aside className="history-dial-panel" aria-live="polite">
      <div className="history-dial-heading"><span>历史周期轮盘</span><small>{eraStageMap[year] !== undefined ? '历史情境映射' : '销售同比教学判读'}</small></div>
      <div className="history-dial-visual">
        <svg viewBox="0 0 300 300" role="img" aria-label={`${year} 年对应周期第 ${stageIndex + 1} 阶段：${stage.name}`}>
          <circle cx="150" cy="150" r="99" className="history-dial-track" />
          <path d="M 150 51 A 99 99 0 0 1 249 150" className="history-arc history-expansion" />
          <path d="M 249 150 A 99 99 0 0 1 150 249" className="history-arc history-hot" />
          <path d="M 150 249 A 99 99 0 0 1 51 150" className="history-arc history-down" />
          <path d="M 51 150 A 99 99 0 0 1 150 51" className="history-arc history-recovery" />
          {stages.map((item, index) => <text key={item.name} x={index === 1 ? 268 : index === 3 ? 32 : 150} y={index === 0 ? 29 : index === 2 ? 282 : 154} textAnchor="middle" className={index === stageIndex ? 'history-stage-label active' : 'history-stage-label'}>{index + 1} · {item.name}</text>)}
          <line x1="150" y1="150" x2={x} y2={y} className="history-dial-hand" />
          <circle cx={x} cy={y} r="7" className="history-dial-dot" />
          <circle cx="150" cy="150" r="62" className="history-dial-core" />
          <circle cx="150" cy="150" r="5" className="history-dial-pin" />
        </svg>
        <div className="history-dial-center"><span>{year}</span><strong>{stage.name}</strong><small>第 {stageIndex + 1} 阶段</small></div>
      </div>
      <div className={`history-dial-stage ${stage.tone}`}><span>{stage.inventory}</span><p>{stage.summary}</p></div>
      <p className="history-dial-help">悬停曲线或时间节点，轮盘随年份转动；点击可锁定。历史情境不等同于实时库存统计。</p>
    </aside>
  )
}

function App() {
  const [segment, setSegment] = useState<SegmentKey>('overall')
  const [playing, setPlaying] = useState(false)
  const [playStage, setPlayStage] = useState(0)
  const [market, setMarket] = useState<MarketKey>('global')
  const [activeTicker, setActiveTicker] = useState<string | null>(null)
  const [talentView, setTalentView] = useState<'trend' | 'roles'>('trend')
  const [methodOpen, setMethodOpen] = useState(false)
  const [dialStyle, setDialStyle] = useState<DialStyle>('aurora')
  const [marketRange, setMarketRange] = useState<'recent' | 'history'>('recent')
  const [activeEra, setActiveEra] = useState(2026)
  const [historyYear, setHistoryYear] = useState(2026)
  const [previewYear, setPreviewYear] = useState<number | null>(null)
  const [salesMode, setSalesMode] = useState<'nominal' | 'real'>('real')
  const displayYear = previewYear ?? historyYear
  const historyStageIndex = historyStageForYear(displayYear, salesMode)
  const selectHistoryYear = (year: number) => {
    setPlaying(false)
    setHistoryYear(year)
    if (eraStageMap[year] !== undefined) setActiveEra(year)
  }

  useEffect(() => {
    if (!playing) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setPlaying(false); return }
    const timer = window.setInterval(() => {
      setPlayStage(prev => {
        if (prev === stages.length - 1) {
          setPlaying(false)
          return 0
        }
        return prev + 1
      })
    }, 1700)
    return () => window.clearInterval(timer)
  }, [playing])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMethodOpen(false); setPlaying(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const current = segments[segment]
  const selectedEra = technologyEras.find(era => era.year === activeEra) ?? technologyEras[0]
  const stage = stages[playStage]
  const dialAngle = playing ? stage.angle : current.angle
  const quotes = marketData.quotes.filter(q => q.market === market)
  const chartData = useMemo(() => marketData.points, [])
  const activeName = activeTicker ? marketData.quotes.find(q => q.ticker === activeTicker)?.name : null
  const baseline = `20${chartData[0].month.replace('/', ' 年 ')} 月`
  const latestPoint = chartData[chartData.length - 1]
  const globalChange = latestPoint.global - 100
  const chinaChange = latestPoint.china - 100
  const formatChange = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`

  const startPlay = () => {
    setPlayStage(0)
    setPlaying(true)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="返回顶部">
          <span className="brand-mark"><Activity size={20} /></span>
          <span>半导体周期<span className="brand-light">／景气罗盘</span></span>
        </a>
        <nav className="desktop-nav" aria-label="页面导航">
          <a href="#cycle">周期定位</a><a href="#markets">市场验证</a>
          <a href="#talent">人才温度</a><a href="#sources">证据来源</a>
        </nav>
        <button className="method-button" onClick={() => setMethodOpen(true)}><CircleHelp size={16} />判读方法</button>
      </header>

      <main id="top">
        <section className="hero section-pad">
          <div className="hero-copy">
            <div className="status-pill"><span className="live-dot" />行情每月更新 · {marketData.updatedAt}</div>
            <h1>半导体，现在走到<br /><em>周期的哪一格？</em></h1>
            <p className="hero-lede">答案不是简单的“顶”或“底”。<strong>AI 与存储高景气扩张，成熟制程分化修复，股价已开始提前定价波动。</strong></p>
            <div className="hero-actions">
              <button className="primary-button" onClick={playing ? () => setPlaying(false) : startPlay}>
                {playing ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                {playing ? '暂停演示' : '播放一轮周期'}
              </button>
              <a className="text-button" href="#markets">用数据验证<ChevronRight size={17} /></a>
            </div>
            <div className="hero-footnote"><ShieldAlert size={15} />教学与研究工具，不构成投资建议；动态展示不等于实时行情。</div>
          </div>
          <div className="hero-visual">
            <CycleDial angle={dialAngle} phase={playing ? `${stage.name} · ${stage.inventory}` : current.phase} playing={playing} style={dialStyle} onStyleChange={setDialStyle} />
            <div className="dial-caption"><span className="caption-line" />{playing ? stage.summary : current.risk}<span className="caption-line" /></div>
          </div>
        </section>

        <section className="ticker-strip" aria-label="核心产业指标">
          {evidenceCards.map(card => (
            <a href={card.url} target="_blank" rel="noreferrer" className="evidence-item" key={card.label}>
              <div><strong>{card.value}</strong><span className="positive">{card.delta}</span></div>
              <p>{card.label}</p><small>{card.source}<ArrowUpRight size={12} /></small>
            </a>
          ))}
        </section>

        <section id="cycle" className="section-pad section-block">
          <div className="section-heading">
            <div><span className="section-kicker">01 · CYCLE MAP</span><h2>同一个行业，四种不同的温度</h2></div>
            <p>点击细分赛道，查看它各自的周期位置。<br />播放模式仅演示库存轮动，不是时间预测。</p>
          </div>
          <div className="segment-tabs" role="tablist" aria-label="选择半导体细分赛道">
            {(Object.keys(segments) as SegmentKey[]).map(key => (
              <button key={key} role="tab" aria-selected={segment === key && !playing} className={segment === key && !playing ? 'active' : ''}
                onClick={() => { setSegment(key); setPlaying(false) }}>{segments[key].label}</button>
            ))}
          </div>

          {playing ? (
            <div className="cycle-explainer playing-panel" aria-live="polite">
              <div className="cycle-main-copy">
                <span className={`phase-badge ${stage.tone}`}>{stage.inventory}</span>
                <h3>{stage.name}阶段：{stage.summary}</h3>
                <div className="signal-list">{stage.signals.map(s => <span key={s}><Check size={15} />{s}</span>)}</div>
              </div>
              <div className="transmission-chain">
                {stage.chain.map((item, i) => <div className="chain-step" key={item}><span>{i + 1}</span><p>{item}</p>{i < stage.chain.length - 1 && <ChevronRight size={18} />}</div>)}
              </div>
            </div>
          ) : (
            <div className="cycle-explainer">
              <div className="cycle-main-copy">
                <span className="phase-badge blue">{current.phase} · {current.risk}</span>
                <h3>{current.title}</h3><p>{current.description}</p>
              </div>
              <div className="evidence-note">
                <span><Activity size={16} />事实依据</span><p>{current.evidence}</p>
                <span><LineChartIcon size={16} />下一项验证</span><p>{current.watch}</p>
              </div>
            </div>
          )}
          <div className="cycle-legend">
            {stages.map((s, i) => <button key={s.name} onClick={() => { setPlayStage(i); setPlaying(true) }}><span className={`legend-dot ${s.tone}`} />{s.name}<small>{s.inventory}</small></button>)}
          </div>
        </section>

        <section id="markets" className="section-pad section-block market-section">
          <div className="section-heading light-heading">
            <div><span className="section-kicker">02 · MARKET CHECK</span><h2>{marketRange === 'recent' ? '产业很热，股价却未必同步' : '技术一级级跃迁，周期一轮轮重演'}</h2></div>
            <p>{marketRange === 'recent' ? <>月度复权价格归一化，{baseline} = 100。<br />最近 12 个月滚动展示，最新月份通常为未完整月度快照。</> : <>1947—2026 技术革命时间轴，叠加 1987—2025 年度销售额。<br />长期增长不等于直线上升，去库存始终存在。</>}</p>
          </div>
          <div className="market-range-toggle" role="tablist" aria-label="图表时间范围">
            <button role="tab" aria-selected={marketRange === 'recent'} className={marketRange === 'recent' ? 'active' : ''} onClick={() => setMarketRange('recent')}><LineChartIcon size={16} />近 12 个月 · 股价</button>
            <button role="tab" aria-selected={marketRange === 'history'} className={marketRange === 'history' ? 'active' : ''} onClick={() => setMarketRange('history')}><BookOpen size={16} />1947—2026 · 长周期</button>
          </div>
          {marketRange === 'recent' ? <div className="market-summary">
            <div><span>全球 · 费城半导体指数</span><strong className={globalChange >= 0 ? 'positive' : 'negative'}>{formatChange(globalChange)}</strong><small>区间表现</small></div>
            <div className="versus">VS</div>
            <div><span>中国大陆 · 四股等权篮子</span><strong className={chinaChange >= 0 ? 'positive' : 'negative'}>{formatChange(chinaChange)}</strong><small>区间表现</small></div>
            <p>A 股篮子由中芯国际、北方华创、韦尔股份、海光信息构成，仅作观察，不是可投资指数。</p>
          </div> : <div className="history-summary">
            <div><span>1987 年起点</span><strong>{salesMode === 'real' ? '$93.5B' : '$33.0B'}</strong><small>{salesMode === 'real' ? '2025 年不变美元' : '当年名义美元'}</small></div>
            <div><span>2001 年下行</span><strong className="negative">{salesMode === 'real' ? '−33.9%' : '−32.0%'}</strong><small>互联网泡沫后去库存</small></div>
            <div><span>2025 年规模</span><strong>$791.7B</strong><small>最新完整年度 · SIA</small></div>
            <p>{salesMode === 'real' ? '实际销售额 = 名义销售额 × 2025 年 CPI ÷ 当年 CPI，剔除美国通胀影响。' : '名义销售额按当年美元计价，长期比较会受到通货膨胀影响。'}年度销售额不是股票指数。</p>
          </div>}
          <div className={marketRange === 'history' ? 'market-layout history-layout' : 'market-layout'}>
            {marketRange === 'history' && <div className="era-timeline" role="tablist" aria-label="半导体技术革命节点">
              {technologyEras.map(era => <button key={era.year} role="tab" aria-selected={activeEra === era.year} className={activeEra === era.year ? 'active' : ''} onMouseEnter={() => setPreviewYear(era.year)} onMouseLeave={() => setPreviewYear(null)} onFocus={() => setPreviewYear(era.year)} onBlur={() => setPreviewYear(null)} onClick={() => selectHistoryYear(era.year)}><strong>{era.year}</strong><span>{era.label}</span></button>)}
            </div>}
            {marketRange === 'history' && <div className="era-detail" aria-live="polite"><span>{selectedEra.year} · 技术平台与产业周期</span><h3>{selectedEra.title}</h3><p>{selectedEra.detail}</p><SourceLink href={selectedEra.url} className="history-source">查看节点依据</SourceLink></div>}
            <div className="market-chart-panel">
              {marketRange === 'recent' ? <>
                <div className="panel-topline"><div><span className="chart-legend global" />全球指数<span className="chart-legend china" />A 股等权篮子{activeName && <><span className="chart-legend selected" />{activeName}</>}</div><small>指数化表现</small></div>
                <div className="chart-container" aria-label="全球与中国大陆半导体股票归一化走势">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 15, right: 10, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,.09)" vertical={false} />
                      <XAxis dataKey="month" stroke="#8e9a9b" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis stroke="#8e9a9b" tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip contentStyle={{ background: '#f4f1e9', border: '0', borderRadius: '4px', color: '#172a2c' }} formatter={(value, name) => [`${value}`, name === 'global' ? '全球' : name === 'china' ? 'A股篮子' : activeName]} />
                      <Line type="monotone" dataKey="global" stroke="#e7b66a" strokeWidth={2.5} dot={false} animationDuration={450} />
                      <Line type="monotone" dataKey="china" stroke="#75b7a6" strokeWidth={2.5} dot={false} animationDuration={450} />
                      {activeTicker && <Line type="monotone" dataKey={activeTicker} stroke="#f1f0e8" strokeWidth={1.5} strokeDasharray="5 4" dot={false} animationDuration={450} />}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="chart-note"><Sparkles size={14} />个股可能强于或弱于产业指数：股价交易的是预期、估值与政策，不是当期销售的简单镜像。</p>
              </> : <>
                <div className="history-linked-grid">
                  <div className="history-chart-column">
                    <div className="history-chart-controls">
                      <div className="panel-topline"><div><span className="chart-legend global" />全球半导体年度销售额</div><small>{salesMode === 'real' ? '2025 年不变美元' : '当年名义美元'} · 十亿美元</small></div>
                      <div className="history-price-toggle" role="group" aria-label="销售额通胀口径">
                        <button className={salesMode === 'real' ? 'active' : ''} aria-pressed={salesMode === 'real'} onClick={() => setSalesMode('real')}>实际 · 剔除通胀</button>
                        <button className={salesMode === 'nominal' ? 'active' : ''} aria-pressed={salesMode === 'nominal'} onClick={() => setSalesMode('nominal')}>名义 · 当年美元</button>
                      </div>
                    </div>
                    <div className="chart-container history-chart" aria-label={`1987至2025年全球半导体${salesMode === 'real' ? '实际' : '名义'}销售额长期走势，悬停可联动历史周期轮盘`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyData.annual} margin={{ top: 24, right: 20, left: 4, bottom: 4 }} onMouseMove={(state) => { const year = Number(state.activeLabel); if (year >= 1987 && year <= 2025) setPreviewYear(year) }} onMouseLeave={() => setPreviewYear(null)} onClick={(state) => { const year = Number(state?.activeLabel); if (year >= 1987 && year <= 2025) selectHistoryYear(year) }}>
                          <CartesianGrid stroke="rgba(255,255,255,.09)" vertical={false} />
                          <XAxis dataKey="year" stroke="#8e9a9b" tickLine={false} axisLine={false} fontSize={12} minTickGap={38} />
                          <YAxis stroke="#8e9a9b" tickLine={false} axisLine={false} fontSize={12} domain={[0, 850]} ticks={[0, 200, 400, 600, 800]} />
                          <Tooltip contentStyle={{ background: '#f4f1e9', border: '0', borderRadius: '4px', color: '#172a2c' }} formatter={(value) => [`$${value}B`, salesMode === 'real' ? '实际销售额 · 2025 年美元' : '名义销售额 · 当年美元']} labelFormatter={(year) => `${year} 年`} />
                          {historyYear >= 1987 && historyYear <= 2025 && <ReferenceLine x={historyYear} stroke="#f1f0e8" strokeDasharray="4 4" label={{ value: historyYear, fill: '#f1f0e8', fontSize: 11, position: 'insideTopLeft' }} />}
                          <Line type="monotone" dataKey={salesMode === 'real' ? 'realSales' : 'sales'} stroke="#e7b66a" strokeWidth={3} dot={{ r: 2.5, fill: '#e7b66a', strokeWidth: 0 }} activeDot={{ r: 5, fill: '#c8f169', stroke: '#172a2c' }} animationDuration={650} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="chart-note"><Sparkles size={14} />年度快照允许二次下行，不强行补全四阶段：1997 年弱扩张后，1998 年再度衰退；轮盘随当前通胀口径重新判读。</p>
                  </div>
                  <HistoryCycleDial year={displayYear} stageIndex={historyStageIndex} />
                </div>
              </>}
            </div>
            {marketRange === 'recent' && <div className="quotes-panel">
              <div className="market-toggle" role="tablist" aria-label="选择股票市场">
                <button className={market === 'global' ? 'active' : ''} onClick={() => { setMarket('global'); setActiveTicker(null) }}><Globe2 size={16} />全球市场</button>
                <button className={market === 'china' ? 'active' : ''} onClick={() => { setMarket('china'); setActiveTicker(null) }}><Landmark size={16} />中国大陆</button>
              </div>
              <div className="quote-list">
                {quotes.map(q => (
                  <button key={q.ticker} className={activeTicker === q.ticker ? 'quote-row selected' : 'quote-row'} onClick={() => setActiveTicker(activeTicker === q.ticker ? null : q.ticker)}>
                    <span><strong>{q.name}</strong><small>{q.ticker}</small></span>
                    <span className="quote-price">{q.price.toLocaleString()}<small>{q.currency}</small></span>
                    <span className={q.change >= 0 ? 'quote-change positive' : 'quote-change negative'}>{q.change >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{Math.abs(q.change)}%</span>
                  </button>
                ))}
              </div>
              <small className="quotes-note">点击个股可叠加走势；再次点击取消。区间为 {baseline}至最新月度快照。</small>
            </div>}
          </div>
          {marketRange === 'recent' ? <div className="data-attribution">行情来源：Yahoo Finance 月度历史数据接口，每月自动更新；本次提取于 {marketData.updatedAt}。不同市场交易时间、币种与公司业务结构不同，归一化仅用于方向比较。</div> : <div className="data-attribution history-attribution">长期数据来源：WSTS / SIA 年度销售额；实际值按 FRED CPIAUCSL 年均值折算为 2025 年美元。2024 采用 SIA Factbook 修订值，2025 采用 SIA 完整年度值；2026 不并入曲线。<span><a href={longTermSources.billings} target="_blank" rel="noreferrer">历史数据<ExternalLink size={12} /></a><a href={longTermSources.cpi} target="_blank" rel="noreferrer">通胀数据<ExternalLink size={12} /></a><a href={longTermSources.annual} target="_blank" rel="noreferrer">2025 年度数据<ExternalLink size={12} /></a></span></div>}
        </section>

        <section id="talent" className="section-pad section-block">
          <div className="section-heading">
            <div><span className="section-kicker">03 · TALENT TEMPERATURE</span><h2>招聘与涨薪，验证景气的“慢变量”</h2></div>
            <p>人才需求通常晚于股价、贴近真实扩产。<br />今年也是“总量回暖，关键岗位更热”。</p>
          </div>
          <div className="talent-grid">
            <div className="talent-chart-panel">
              <div className="panel-title-row">
                <div><BriefcaseBusiness size={20} /><h3>{talentView === 'trend' ? '行业年度涨薪率' : '岗位年总现金收入中位数'}</h3></div>
                <div className="small-toggle"><button className={talentView === 'trend' ? 'active' : ''} onClick={() => setTalentView('trend')}>涨薪趋势</button><button className={talentView === 'roles' ? 'active' : ''} onClick={() => setTalentView('roles')}>岗位薪酬</button></div>
              </div>
              <div className="talent-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart key={talentView} data={talentView === 'trend' ? salaryTrend : roleSalaries} layout={talentView === 'roles' ? 'vertical' : 'horizontal'} margin={{ top: 20, right: 18, left: talentView === 'roles' ? 18 : -18, bottom: 0 }}>
                    <CartesianGrid stroke="#dcded5" vertical={false} />
                    {talentView === 'trend' && <XAxis dataKey="year" tickLine={false} axisLine={false} />}
                    {talentView === 'trend' && <YAxis unit="%" tickLine={false} axisLine={false} />}
                    {talentView === 'roles' && <XAxis type="number" unit="万" tickLine={false} axisLine={false} />}
                    {talentView === 'roles' && <YAxis type="category" dataKey="role" width={72} tickLine={false} axisLine={false} />}
                    <Tooltip formatter={(v) => talentView === 'trend' ? [`${v}%`, '涨薪率'] : [`${v} 万元`, '年总现金中位数']} cursor={{ fill: '#e6e8df' }} />
                    {talentView === 'trend' && <Bar dataKey="rate" fill="#2e6e63" radius={[3, 3, 0, 0]} />}
                    {talentView === 'roles' && <Bar dataKey="salary" fill="#c65b3c" radius={[0, 3, 3, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-source">{talentView === 'trend' ? '2021—2024：薪智；2025H1：埃摩森，口径拼接仅用于观察方向。' : '埃摩森《2025 年上半年半导体行业薪酬白皮书》，不代表 offer 保证。'}</p>
            </div>
            <div className="hiring-panel">
              <span className="hiring-label">2026 招聘信号</span>
              <div className="big-stat"><strong>+32%</strong><span>半导体行业招聘岗位总数同比<small>2026 年节后一个月</small></span></div>
              <div className="big-stat accent"><strong>+58%</strong><span>AI 芯片方向岗位同比<small>明显高于行业整体</small></span></div>
              <div className="hiring-divider" />
              <div className="software-stat"><span>半导体与集成电路软件／算法岗位</span><strong>+47.8%</strong><small>2026 年 1—9 月同比；平均招聘年薪 55.5 万元</small></div>
              <p className="hiring-insight">不是普遍加薪，而是 AI、先进封装、EDA 与制造关键岗位获得更高溢价。</p>
              <div className="hiring-links"><SourceLink href={sourceUrls.jobs}>人才报告</SourceLink><SourceLink href={sourceUrls.liepin}>猎聘转型报告</SourceLink></div>
            </div>
          </div>
        </section>

        <section className="section-pad section-block news-section">
          <div className="section-heading">
            <div><span className="section-kicker">04 · NEWS & CATALYSTS</span><h2>最近的新闻，怎样改变周期位置？</h2></div>
            <p>每条新闻都标注其影响的周期变量，<br />避免把“利好”直接等同于“股价会上涨”。</p>
          </div>
          <div className="news-timeline">
            {news.map((item, i) => (
              <a href={item.url} target="_blank" rel="noreferrer" className="news-item" key={`${item.date}-${i}`}>
                <time>{item.date}<small>2026</small></time><span className="news-tag">{item.tag}</span>
                <div><h3>{item.title}</h3><p>{item.detail}</p></div><ArrowUpRight size={19} />
              </a>
            ))}
          </div>
        </section>

        <section id="sources" className="section-pad section-block knowledge-section">
          <div className="section-heading light-heading">
            <div><span className="section-kicker">05 · MENTAL MODEL</span><h2>用三层周期，替代单一“牛熊”叙事</h2></div>
            <p>书籍解释结构，研报提供框架，<br />高频数据负责验证或推翻当前判断。</p>
          </div>
          <div className="framework-grid">
            <div className="framework-card"><span>长周期 · 8—10 年</span><h3>创新 / 需求</h3><p>PC、智能手机到 AI 基础设施，决定产业增长中枢。</p><small>观察：终端渗透率、云厂商资本开支、单机芯片价值量</small></div>
            <div className="framework-card featured"><span>中周期 · 约 3—4 年</span><h3>资本开支 / 产能</h3><p>建厂与产能释放滞后，制造今天的紧缺与明天的过剩。</p><small>观察：设备订单、资本开支、晶圆产能、稼动率</small></div>
            <div className="framework-card"><span>短周期 · 3—6 个季度</span><h3>库存 / 价格</h3><p>补库与去库放大真实需求，往往最先反映在销售与价格。</p><small>观察：库存天数、DRAM/NAND 价格、交期、销售额环比</small></div>
          </div>
          <div className="books-reports">
            <div className="books-column">
              <h3><BookOpen size={20} />三本书，建立产业直觉</h3>
              <SourceLink href={sourceUrls.chipwar} className="book-item"><span>01</span><div><strong>《芯片战争》</strong><small>Chris Miller · 2022</small><p>理解先进制造为何集中，以及地缘政治如何改变供给曲线。</p></div></SourceLink>
              <SourceLink href={sourceUrls.chip} className="book-item"><span>02</span><div><strong>《The Chip》</strong><small>T. R. Reid · 1984 / 2001 修订版</small><p>从发明与产业化历史理解技术扩散、工程人才和规模制造。</p></div></SourceLink>
              <SourceLink href={sourceUrls.history} className="book-item"><span>03</span><div><strong>《半导体简史》</strong><small>王齐、范淑琴 · 2022</small><p>沿基础、应用与制造三条线，补齐全产业链的历史图景。</p></div></SourceLink>
            </div>
            <div className="reports-column">
              <h3><Newspaper size={20} />当前判断所依据的研报</h3>
              <SourceLink href={sourceUrls.framework} className="report-item"><div><strong>《全球半导体产业框架与投资机遇》</strong><p>创新—产能—库存三周期框架；库存约 3—6 个季度，产能约 3—4 年。</p><small>券商行业框架 · 2023</small></div><ArrowUpRight size={17} /></SourceLink>
              <SourceLink href={sourceUrls.memory} className="report-item"><div><strong>《从周期出清到 AI 重构：存储行业历史复盘与新周期展望》</strong><p>复盘供给收缩、HBM 挤占与 AI 需求共振，提示价格和扩产风险。</p><small>存储行业专题 · 2026.09</small></div><ArrowUpRight size={17} /></SourceLink>
              <SourceLink href={sourceUrls.semi} className="report-item"><div><strong>SEMI《300mm Fab Outlook》公开摘要</strong><p>设备支出上修确认扩产强度，也为未来供给提供领先信号。</p><small>SEMI · 2026.10</small></div><ArrowUpRight size={17} /></SourceLink>
            </div>
          </div>
          <div className="risk-box"><ShieldAlert size={23} /><div><strong>最值得跟踪的反转组合</strong><p>销售额环比连续放缓 + 库存天数回升 + 存储价格转跌 + 新产能集中释放。若仅有股价回调，而产业四项仍强，不宜直接定义为周期反转。</p></div></div>
        </section>
      </main>

      <footer className="footer section-pad"><div className="brand"><span className="brand-mark"><Activity size={18} /></span>半导体周期／景气罗盘</div><p>行情每月自动更新；研究判断与人才资料保留来源日期，不随行情自动改写。</p><a href="#top">回到顶部<ArrowUpRight size={15} /></a></footer>

      {methodOpen && <div className="modal-backdrop" onClick={() => setMethodOpen(false)}>
        <section className="method-modal" role="dialog" aria-modal="true" aria-labelledby="method-title" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setMethodOpen(false)} aria-label="关闭判读方法"><X size={20} /></button>
          <span className="section-kicker">METHODOLOGY</span><h2 id="method-title">这张罗盘怎样判读？</h2>
          <ol><li><strong>先分赛道。</strong>整体定位是定性综合，不是加权指数；AI、存储、设备与成熟制程分别定位。</li><li><strong>再看三组证据。</strong>销售／库存／稼动率确认当下，设备／资本开支观察未来供给，股价／招聘验证预期与经营行为。</li><li><strong>最后找反证。</strong>股价下跌不必然是周期下行；销售增长也不必然等于健康。需要库存、价格与产能共同确认。</li></ol>
          <div className="method-caveat"><CircleHelp size={18} /><p>薪酬与岗位数据来自不同机构、不同时间窗口，不做严格同口径拼接；A 股等权篮子不含分红且不可投资；行情为每月更新的滚动月度快照，研究判断不会自动改写。</p></div>
          <button className="primary-button" onClick={() => setMethodOpen(false)}>明白了，继续看图</button>
        </section>
      </div>}
    </div>
  )
}

export default App
