export const translations = {
  en: {
    // Navigation
    nav: {
      title: "US Index Constituents",
      nasdaq100: "Nasdaq 100",
      sp500: "S&P 500",
      dow: "Dow Jones 30",
      indexConstituents: "Index Constituents",
      historicalReturns: "Historical Returns",
      contact: "Contact Us",
      qdii: "QDII Funds",
      mega7: "Mega 7+ Stocks",
      macro: "Macro"
    },
    // Index Pages
    index: {
      loading: "Loading...",
      noData: "No data available",
      showing: "Showing",
      to: "to",
      of: "of",
      // Table Headers
      no: "No.",
      symbol: "Symbol",
      companyName: "Company Name",
      athPrice: "ATH Price",
      athDate: "ATH Date",
      athChange: "ATH Change %",
      price: "Price",
      change: "Change %",
      weight: "Weight %",
      marketCap: "Market Cap",
      peRatio: "P/E Ratio",
      forwardPe: "Forward P/E",
      psRatio: "P/S Ratio",
      pbRatio: "P/B Ratio",
      epsTtm: "EPS TTM"
    },
    // Nasdaq 100
    nasdaq100: {
      title: "Nasdaq 100 Index - Constituents & Historical Returns",
      description: "View Nasdaq 100 constituents with real-time data, prices, ATH analysis, and historical returns.",
      heading: "Nasdaq 100 Index Constituents",
      subheading: "View all Nasdaq 100 stocks with weights, last closing prices, ATH data, and key financial ratios"
    },
    // S&P 500
    sp500: {
      title: "S&P 500 Index - Constituents & Historical Returns",
      description: "View S&P 500 constituents with real-time data, prices, ATH analysis, and historical returns.",
      heading: "S&P 500 Index Constituents",
      subheading: "View all S&P 500 stocks with weights, last closing prices, ATH data, and key financial ratios"
    },
    // Dow Jones
    dow: {
      title: "Dow Jones Industrial Average - Constituents & Historical Returns",
      description: "View Dow Jones constituents with real-time data, prices, ATH analysis, and historical returns.",
      heading: "Dow Jones 30 Index Constituents",
      subheading: "View all Dow Jones 30 stocks with weights, last closing prices, ATH data, and key financial ratios"
    },
    // Contact
    contact: {
      title: "Contact Us",
      description: "Send us your feedback, questions, or suggestions",
      heading: "Get in Touch",
      subheading: "We'd love to hear from you. Send us a message and we'll respond as soon as possible.",
      nameLabel: "Your Name",
      namePlaceholder: "John Doe",
      emailLabel: "Your Email",
      emailPlaceholder: "john@example.com",
      messageLabel: "Your Message",
      messagePlaceholder: "Tell us what's on your mind...",
      submitButton: "Send Message",
      submittingButton: "Sending...",
      successMessage: "Thank you! Your message has been sent successfully.",
      successSubtext: "We'll get back to you soon!",
      sendAnother: "Send Another Message",
      errorMessage: "Oops! Something went wrong. Please try again.",
      emailWarning: "You haven't provided an email. We won't be able to respond. Continue anyway?",
      reachUs: "Or reach us through:",
      email: "support@example.com"
    },
    // Historical Returns Chart
    returns: {
      title: "Historical Returns",
      loading: "Loading chart data...",
      error: "Failed to load chart data",
      ytd: "YTD",
      oneYear: "1 Year",
      threeYear: "3 Year",
      fiveYear: "5 Year",
      tenYear: "10 Year",
      max: "Max",
      date: "Date",
      value: "Value",
      return: "Return",
      yearlyReturns: "Yearly Returns",
      totalDataPoints: "Total Data Points",
      monthlyCandles: "Monthly Candles",
      positiveYears: "Positive Years",
      outOf: "out of",
      years: "years",
      averageReturn: "Average Return",
      perYear: "per year"
    },
    // Footer
    footer: {
      about: "About",
      aboutText: "Providing comprehensive data on US stock indices and QDII fund quotas.",
      quickLinks: "Quick Links",
      aboutUs: "About Us",
      contactUs: "Contact Us",
      legal: "Legal",
      termsOfUse: "Terms of Use",
      privacyPolicy: "Privacy Policy",
      dataDisclaimer: "Data Disclaimer",
      resources: "Resources",
      copyright: "All rights reserved.",
      sitemap: "Sitemap"
    },
    // Macro Indicators Page
    macro: {
      title: "US Macro Indicators",
      description: "US Treasury yields, inflation (CPI/PCE), and Federal Reserve policy rate from FRED.",
      heading: "US Macro Indicators",
      subheading: "Treasury yields, inflation, and Fed policy at a glance — sourced from FRED (Federal Reserve Bank of St. Louis).",
      loading: "Loading macro indicators...",
      error: "Failed to load macro indicators.",
      missingKey: "FRED_API_KEY is not configured on the server.",
      lastUpdated: "Last updated",
      dataSource: "Data source",
      fred: "FRED",
      partialWarning: "Some series could not be loaded:",
      range: {
        oneYear: "1Y",
        fiveYear: "5Y",
        tenYear: "10Y",
        max: "MAX"
      },
      summary: {
        latest: "Latest"
      },
      charts: {
        yields: "2Y / 10Y / 30Y Treasury Yields",
        yieldsSubtitle: "Right axis: 10Y − 2Y spread (negative = inversion)",
        inflationCpi: "CPI vs Core CPI (Year-over-Year)",
        inflationPce: "PCE vs Core PCE (Year-over-Year)",
        fedFunds: "Federal Funds Rate",
        centralBanks: "Major Central Bank Policy Rates",
        usdIndex: "US Dollar Index (DXY)"
      },
      legend: {
        dgs2: "2Y Yield",
        dgs10: "10Y Yield",
        dgs30: "30Y Yield",
        spread: "10Y − 2Y Spread",
        cpi: "CPI",
        coreCpi: "Core CPI",
        pce: "PCE",
        corePce: "Core PCE",
        dff: "Effective FFR",
        fedFundsUpper: "Target Upper",
        bojRate: "BOJ (Japan call rate)",
        boeRate: "BOE (UK call rate)",
        usdIndex: "DXY"
      },
      axis: {
        percent: "Percent (%)",
        spread: "Spread (pp)",
        index: "Index",
        date: "Date"
      }
    }
  },
  zh: {
    // Navigation
    nav: {
      title: "QDII基金申购额度查询",
      nasdaq100: "纳斯达克100",
      sp500: "标普500",
      dow: "道琼斯30",
      indexConstituents: "指数成分股",
      historicalReturns: "历史回报",
      contact: "联系我们",
      qdii: "基金额度",
      mega7: "Mega 7+ 股票",
      macro: "宏观"
    },
    // Index Pages
    index: {
      loading: "加载中...",
      noData: "暂无数据",
      showing: "显示",
      to: "到",
      of: "，共",
      // Table Headers
      no: "序号",
      symbol: "代码",
      companyName: "公司名称",
      athPrice: "历史最高价",
      athDate: "最高价日期",
      athChange: "距最高价 %",
      price: "价格",
      change: "涨跌 %",
      weight: "权重 %",
      marketCap: "市值",
      peRatio: "市盈率",
      forwardPe: "预期市盈率",
      psRatio: "市销率",
      pbRatio: "市净率",
      epsTtm: "每股收益"
    },
    // Nasdaq 100
    nasdaq100: {
      title: "纳斯达克100指数 - 成分股与历史回报",
      description: "查看纳斯达克100成分股的实时数据、价格、历史最高价分析和历史回报。",
      heading: "纳斯达克100指数成分股",
      subheading: "查看所有纳斯达克100股票的权重、最新收盘价、历史最高价数据和关键财务指标"
    },
    // S&P 500
    sp500: {
      title: "标普500指数 - 成分股与历史回报",
      description: "查看标普500成分股的实时数据、价格、历史最高价分析和历史回报。",
      heading: "标普500指数成分股",
      subheading: "查看所有标普500股票的权重、最新收盘价、历史最高价数据和关键财务指标"
    },
    // Dow Jones
    dow: {
      title: "道琼斯工业平均指数 - 成分股与历史回报",
      description: "查看道琼斯成分股的实时数据、价格、历史最高价分析和历史回报。",
      heading: "道琼斯30指数成分股",
      subheading: "查看所有道琼斯30股票的权重、最新收盘价、历史最高价数据和关键财务指标"
    },
    // Contact
    contact: {
      title: "联系我们",
      description: "发送您的反馈、问题或建议",
      heading: "联系我们",
      subheading: "我们很乐意听取您的意见。请给我们留言，我们会尽快回复。",
      nameLabel: "您的姓名",
      namePlaceholder: "张三",
      emailLabel: "您的邮箱",
      emailPlaceholder: "zhangsan@example.com",
      messageLabel: "留言内容",
      messagePlaceholder: "告诉我们您的想法...",
      submitButton: "发送留言",
      submittingButton: "发送中...",
      successMessage: "感谢您！您的留言已成功发送。",
      successSubtext: "我们会尽快回复您！",
      sendAnother: "发送另一条留言",
      errorMessage: "哎呀！出了点问题。请重试。",
      emailWarning: "您未提供邮箱，我们无法回复您的留言。确定要继续提交吗？",
      reachUs: "或通过以下方式联系我们：",
      email: "support@example.com"
    },
    // Historical Returns Chart
    returns: {
      title: "历史回报",
      loading: "加载图表数据中...",
      error: "加载图表数据失败",
      ytd: "年初至今",
      oneYear: "1年",
      threeYear: "3年",
      fiveYear: "5年",
      tenYear: "10年",
      max: "全部",
      date: "日期",
      value: "数值",
      return: "回报",
      yearlyReturns: "年度回报",
      totalDataPoints: "数据总量",
      monthlyCandles: "月度数据",
      positiveYears: "正回报年份",
      outOf: "共",
      years: "年",
      averageReturn: "平均回报",
      perYear: "每年"
    },
    // Footer
    footer: {
      about: "关于",
      aboutText: "提供美股指数和QDII基金额度的综合数据。",
      quickLinks: "快速链接",
      aboutUs: "关于我们",
      contactUs: "联系我们",
      legal: "法律信息",
      termsOfUse: "使用条款",
      privacyPolicy: "隐私政策",
      dataDisclaimer: "数据免责声明",
      resources: "资源",
      copyright: "版权所有。",
      sitemap: "网站地图"
    },
    // Macro Indicators Page
    macro: {
      title: "美国宏观经济指标",
      description: "来自FRED的美国国债收益率、通胀（CPI/PCE）和美联储政策利率。",
      heading: "美国宏观经济指标",
      subheading: "一览美国国债收益率、通胀和美联储政策——数据来源：FRED（圣路易斯联邦储备银行）。",
      loading: "正在加载宏观指标...",
      error: "加载宏观指标失败。",
      missingKey: "服务器未配置 FRED_API_KEY。",
      lastUpdated: "最近更新",
      dataSource: "数据来源",
      fred: "FRED",
      partialWarning: "部分数据系列加载失败：",
      range: {
        oneYear: "1年",
        fiveYear: "5年",
        tenYear: "10年",
        max: "全部"
      },
      summary: {
        latest: "最新值"
      },
      charts: {
        yields: "2年 / 10年 / 30年 美国国债收益率",
        yieldsSubtitle: "右轴：10年期 − 2年期 利差（负值表示利率倒挂）",
        inflationCpi: "CPI 与 核心CPI（同比）",
        inflationPce: "PCE 与 核心PCE（同比）",
        fedFunds: "联邦基金利率",
        centralBanks: "主要央行政策利率",
        usdIndex: "美元指数 (DXY)"
      },
      legend: {
        dgs2: "2年期收益率",
        dgs10: "10年期收益率",
        dgs30: "30年期收益率",
        spread: "10年 − 2年 利差",
        cpi: "CPI",
        coreCpi: "核心CPI",
        pce: "PCE",
        corePce: "核心PCE",
        dff: "有效联邦基金利率",
        fedFundsUpper: "目标利率上限",
        bojRate: "日本央行（无担保隔夜利率）",
        boeRate: "英国央行（隔夜利率）",
        usdIndex: "美元指数 DXY"
      },
      axis: {
        percent: "百分比 (%)",
        spread: "利差 (个百分点)",
        index: "指数",
        date: "日期"
      }
    }
  }
};

export type Language = 'en' | 'zh';

export function useTranslation(lang: Language) {
  return translations[lang];
}
