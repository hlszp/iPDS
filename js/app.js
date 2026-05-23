// iPDS系统主要JavaScript代码

class iPDSApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.sidebarCollapsed = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadPage('dashboard');
        this.startDataRefresh();
    }

    bindEvents() {
        // 侧边栏切换
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            this.toggleSidebar();
        });

        // 导航菜单点击
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.loadPage(page);
                this.setActiveNav(e.currentTarget);
            });
        });

        // 响应式处理
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        this.sidebarCollapsed = !this.sidebarCollapsed;
        
        if (this.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }
    }

    setActiveNav(activeLink) {
        // 移除所有活动状态
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // 设置当前活动状态
        activeLink.classList.add('active');
    }

    updateBreadcrumb(items) {
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerHTML = '';
        
        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'breadcrumb-item';
            
            if (index === items.length - 1) {
                li.className += ' active';
                li.textContent = item;
            } else {
                const a = document.createElement('a');
                a.href = '#';
                a.textContent = item;
                li.appendChild(a);
            }
            
            breadcrumb.appendChild(li);
        });
    }

    loadPage(pageName) {
        this.currentPage = pageName;
        const pageContent = document.getElementById('pageContent');
        
        // 显示加载状态
        pageContent.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
        
        // 模拟加载延迟
        setTimeout(() => {
            switch(pageName) {
                case 'dashboard':
                    this.loadDashboard();
                    break;
                case 'data-acquisition':
                    this.loadDataAcquisition();
                    break;
                case 'loop-management':
                    this.loadLoopManagement();
                    break;
                case 'performance-evaluation':
                    this.loadPerformanceEvaluation();
                    break;
                case 'comprehensive-evaluation':
                    this.loadComprehensiveEvaluation();
                    break;
                case 'performance-diagnosis':
                    this.loadPerformanceDiagnosis();
                    break;
                case 'performance-optimization':
                    this.loadPerformanceOptimization();
                    break;
                case 'intelligent-condition':
                    this.loadIntelligentCondition();
                    break;
                case 'reports-visualization':
                    this.loadReportsVisualization();
                    break;
                case 'llm-assistant':
                    this.loadLLMAssistant();
                    break;
                default:
                    this.loadComingSoon(pageName);
            }
        }, 500);
    }

    loadDashboard() {
        this.updateBreadcrumb(['首页', '系统概览']);
        
        const content = `
            <div class="page-header">
                <h1 class="page-title">系统概览</h1>
                <p class="page-description">实时监控系统运行状态，掌握关键性能指标和告警信息</p>
            </div>

            <!-- KPI统计卡片 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-speedometer2"></i>
                        </div>
                        <div class="stat-value" id="avgPerformance">85.6</div>
                        <div class="stat-label">平均性能评分</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +2.3% 较昨日
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <div class="stat-value" id="autoControlRate">92.8%</div>
                        <div class="stat-label">实时自控率</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +0.5% 较昨日
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <div class="stat-value" id="lowPerformanceLoops">23</div>
                        <div class="stat-label">低性能回路</div>
                        <div class="stat-trend down">
                            <i class="bi bi-arrow-down"></i> -5 较昨日
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-bell"></i>
                        </div>
                        <div class="stat-value" id="pendingAlerts">8</div>
                        <div class="stat-label">待处理告警</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +3 较昨日
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- 系统状态监控 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-activity"></i> 系统状态监控</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>数据采集状态</span>
                                    <span class="status-badge online">在线</span>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-success" style="width: 98%"></div>
                                </div>
                                <small class="text-muted">在线数据源: 12/15</small>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>性能评估状态</span>
                                    <span class="status-badge online">运行中</span>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-primary" style="width: 100%"></div>
                                </div>
                                <small class="text-muted">活跃任务: 3个</small>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>诊断任务状态</span>
                                    <span class="status-badge warning">部分异常</span>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-warning" style="width: 85%"></div>
                                </div>
                                <small class="text-muted">运行中: 2个</small>
                            </div>
                            <div>
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>系统资源状态</span>
                                    <span class="status-badge online">正常</span>
                                </div>
                                <div class="progress" style="height: 6px;">
                                    <div class="progress-bar bg-info" style="width: 78%"></div>
                                </div>
                                <small class="text-muted">CPU: 45%, 内存: 62%</small>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 实时告警面板 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">
                                <i class="bi bi-bell"></i> 实时告警面板
                                <span class="badge bg-danger ms-2">8</span>
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-danger alert-sm mb-2">
                                <div class="d-flex justify-content-between">
                                    <strong>TT-101温度传感器异常</strong>
                                    <small>2分钟前</small>
                                </div>
                                <small>温度读数超出正常范围</small>
                            </div>
                            <div class="alert alert-warning alert-sm mb-2">
                                <div class="d-flex justify-content-between">
                                    <strong>FC-205流量控制器响应慢</strong>
                                    <small>5分钟前</small>
                                </div>
                                <small>响应时间超过阈值</small>
                            </div>
                            <div class="alert alert-info alert-sm mb-2">
                                <div class="d-flex justify-content-between">
                                    <strong>PC-301压力控制回路优化完成</strong>
                                    <small>10分钟前</small>
                                </div>
                                <small>性能提升15%</small>
                            </div>
                            <div class="text-center mt-3">
                                <button class="btn btn-outline-primary btn-sm">查看所有告警</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 回路性能分布 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-pie-chart"></i> 回路性能分布</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container" id="performanceDistribution"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 性能趋势分析 -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-graph-up"></i> 性能趋势分析</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container" id="performanceTrend"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
        
        // 初始化图表
        this.initDashboardCharts();
    }

    initDashboardCharts() {
        // 性能分布饼图
        const distributionChart = echarts.init(document.getElementById('performanceDistribution'));
        const distributionOption = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c} ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'middle'
            },
            series: [
                {
                    name: '性能等级',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['60%', '50%'],
                    data: [
                        { value: 89, name: '优秀 (≥90分)', itemStyle: { color: '#52c41a' } },
                        { value: 44, name: '良好 (80-90分)', itemStyle: { color: '#1890ff' } },
                        { value: 23, name: '一般 (<80分)', itemStyle: { color: '#faad14' } }
                    ],
                    emphasis: {
                        itemStyle: {
                            shadowBlur: 10,
                            shadowOffsetX: 0,
                            shadowColor: 'rgba(0, 0, 0, 0.5)'
                        }
                    }
                }
            ]
        };
        distributionChart.setOption(distributionOption);

        // 性能趋势图
        const trendChart = echarts.init(document.getElementById('performanceTrend'));
        const trendOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: ['性能评分', '自控率', '响应时间']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
            },
            yAxis: [
                {
                    type: 'value',
                    name: '评分/百分比',
                    min: 0,
                    max: 100
                },
                {
                    type: 'value',
                    name: '响应时间(ms)',
                    min: 0,
                    max: 1000,
                    position: 'right'
                }
            ],
            series: [
                {
                    name: '性能评分',
                    type: 'line',
                    data: [82, 85, 88, 86, 89, 87, 85],
                    smooth: true,
                    itemStyle: { color: '#1890ff' }
                },
                {
                    name: '自控率',
                    type: 'line',
                    data: [90, 92, 94, 93, 95, 94, 93],
                    smooth: true,
                    itemStyle: { color: '#52c41a' }
                },
                {
                    name: '响应时间',
                    type: 'line',
                    yAxisIndex: 1,
                    data: [450, 420, 380, 400, 350, 380, 420],
                    smooth: true,
                    itemStyle: { color: '#faad14' }
                }
            ]
        };
        trendChart.setOption(trendOption);

        // 响应式处理
        window.addEventListener('resize', () => {
            distributionChart.resize();
            trendChart.resize();
        });
    }

    startDataRefresh() {
        // 模拟数据实时更新
        setInterval(() => {
            this.updateDashboardData();
        }, 5000);
    }

    updateDashboardData() {
        if (this.currentPage === 'dashboard') {
            // 更新KPI数据
            const avgPerformance = document.getElementById('avgPerformance');
            if (avgPerformance) {
                const newValue = (85 + Math.random() * 10).toFixed(1);
                avgPerformance.textContent = newValue;
            }

            const autoControlRate = document.getElementById('autoControlRate');
            if (autoControlRate) {
                const newValue = (90 + Math.random() * 8).toFixed(1) + '%';
                autoControlRate.textContent = newValue;
            }
        }
    }

    loadDataAcquisition() {
        this.updateBreadcrumb(['首页', '数据采集与预处理']);

        const content = `
            <div class="page-header d-flex justify-content-between align-items-start">
                <div>
                    <h1 class="page-title">数据采集与预处理</h1>
                    <p class="page-description">实时数据采集、预处理和质量监控的统一管理平台</p>
                </div>
                <div>
                    <button class="btn btn-primary me-2">
                        <i class="bi bi-plus"></i> 添加数据源
                    </button>
                    <button class="btn btn-outline-secondary">
                        <i class="bi bi-arrow-clockwise"></i> 刷新
                    </button>
                </div>
            </div>

            <!-- 数据采集概览 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-database"></i>
                        </div>
                        <div class="stat-value">15</div>
                        <div class="stat-label">数据源总数</div>
                        <div class="stat-trend">在线: 12 | 离线: 3</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-lightning"></i>
                        </div>
                        <div class="stat-value">1,256</div>
                        <div class="stat-label">采集速率 (点/秒)</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +5.2% 较昨日
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <div class="stat-value">99.2%</div>
                        <div class="stat-label">数据质量</div>
                        <div class="stat-trend">完整性: 99.2% | 准确性: 98.7%</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-hdd"></i>
                        </div>
                        <div class="stat-value">2.8TB</div>
                        <div class="stat-label">存储使用</div>
                        <div class="stat-trend">使用率: 28% (2.8/10TB)</div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- 数据源管理 -->
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-database"></i> 数据源管理</h5>
                            <button class="btn btn-primary btn-sm" onclick="iPDSApp.showDataSourceModal()">
                                <i class="bi bi-plus"></i> 添加数据源
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>数据源名称</th>
                                            <th>类型</th>
                                            <th>状态</th>
                                            <th>数据点</th>
                                            <th>最后更新</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody id="dataSourceTable">
                                        <tr>
                                            <td>
                                                <div>
                                                    <strong>DCS-主控系统</strong>
                                                    <br><small class="text-muted">DCS主控制系统数据采集</small>
                                                </div>
                                            </td>
                                            <td><span class="badge bg-primary">OPC UA</span></td>
                                            <td><span class="status-badge online">在线</span></td>
                                            <td>1,256</td>
                                            <td>2分钟前</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary me-1">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-secondary me-1">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-success">
                                                    <i class="bi bi-wifi"></i>
                                                </button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div>
                                                    <strong>PLC-装置A</strong>
                                                    <br><small class="text-muted">装置A PLC数据采集</small>
                                                </div>
                                            </td>
                                            <td><span class="badge bg-success">Modbus TCP</span></td>
                                            <td><span class="status-badge online">在线</span></td>
                                            <td>456</td>
                                            <td>1分钟前</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary me-1">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-secondary me-1">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-success">
                                                    <i class="bi bi-wifi"></i>
                                                </button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div>
                                                    <strong>SCADA-监控系统</strong>
                                                    <br><small class="text-muted">SCADA监控系统接口</small>
                                                </div>
                                            </td>
                                            <td><span class="badge bg-info">OPC DA</span></td>
                                            <td><span class="status-badge offline">离线</span></td>
                                            <td>789</td>
                                            <td>5分钟前</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary me-1">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-secondary me-1">
                                                    <i class="bi bi-pencil"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-danger">
                                                    <i class="bi bi-wifi-off"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 实时数据流监控 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-activity"></i> 实时数据流</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container" id="dataFlowChart" style="height: 300px;"></div>
                            <div class="row text-center mt-3">
                                <div class="col-4">
                                    <div class="fw-bold">1,256</div>
                                    <small class="text-muted">数据点/秒</small>
                                </div>
                                <div class="col-4">
                                    <div class="fw-bold">50ms</div>
                                    <small class="text-muted">平均延迟</small>
                                </div>
                                <div class="col-4">
                                    <div class="fw-bold">0.1%</div>
                                    <small class="text-muted">丢包率</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
        this.initDataFlowChart();
    }

    initDataFlowChart() {
        const chart = echarts.init(document.getElementById('dataFlowChart'));
        const option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: Array.from({ length: 20 }, (_, i) => {
                    const now = new Date();
                    now.setMinutes(now.getMinutes() - (19 - i));
                    return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                })
            },
            yAxis: {
                type: 'value',
                name: '数据点/秒',
                min: 1000,
                max: 1500
            },
            series: [
                {
                    name: '数据点/秒',
                    type: 'line',
                    data: Array.from({ length: 20 }, () => Math.floor(Math.random() * 200) + 1100),
                    smooth: true,
                    itemStyle: { color: '#1890ff' },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                                { offset: 1, color: 'rgba(24, 144, 255, 0.1)' }
                            ]
                        }
                    }
                }
            ]
        };
        chart.setOption(option);

        // 模拟实时数据更新
        setInterval(() => {
            const data = option.series[0].data;
            data.shift();
            data.push(Math.floor(Math.random() * 200) + 1100);
            chart.setOption(option);
        }, 2000);
    }

    showDataSourceModal() {
        // 这里可以添加模态框显示逻辑
        alert('添加数据源功能 - 在实际应用中这里会显示一个模态框');
    }

    loadLoopManagement() {
        this.updateBreadcrumb(['首页', '控制回路管理']);

        const content = `
            <div class="page-header">
                <h1 class="page-title">控制回路管理</h1>
                <p class="page-description">统一管理和配置系统中的所有控制回路</p>
            </div>

            <!-- 回路统计 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-gear"></i>
                        </div>
                        <div class="stat-value">156</div>
                        <div class="stat-label">总回路数</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <div class="stat-value">152</div>
                        <div class="stat-label">在线回路</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-star"></i>
                        </div>
                        <div class="stat-value">89</div>
                        <div class="stat-label">优秀回路</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <div class="stat-value">23</div>
                        <div class="stat-label">待优化</div>
                    </div>
                </div>
            </div>

            <!-- 功能入口 -->
            <div class="row">
                <div class="col-lg-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body text-center">
                            <div class="stat-icon primary mx-auto mb-3">
                                <i class="bi bi-list-ul"></i>
                            </div>
                            <h5>回路列表</h5>
                            <p class="text-muted">查看和管理所有控制回路</p>
                            <div class="mb-3">
                                <span class="badge bg-primary">156个回路</span>
                            </div>
                            <button class="btn btn-primary">进入管理</button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body text-center">
                            <div class="stat-icon success mx-auto mb-3">
                                <i class="bi bi-gear"></i>
                            </div>
                            <h5>回路配置</h5>
                            <p class="text-muted">配置回路参数和控制策略</p>
                            <div class="mb-3">
                                <span class="badge bg-warning">待配置: 3个</span>
                            </div>
                            <button class="btn btn-success">配置管理</button>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4 mb-4">
                    <div class="card h-100">
                        <div class="card-body text-center">
                            <div class="stat-icon warning mx-auto mb-3">
                                <i class="bi bi-activity"></i>
                            </div>
                            <h5>回路监控</h5>
                            <p class="text-muted">实时监控回路运行状态</p>
                            <div class="mb-3">
                                <span class="badge bg-success">在线: 152个</span>
                            </div>
                            <button class="btn btn-warning">实时监控</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
    }

    loadPerformanceEvaluation() {
        this.updateBreadcrumb(['首页', '单回路性能评估']);

        const content = `
            <div class="page-header">
                <h1 class="page-title">单回路性能评估</h1>
                <p class="page-description">单回路性能评估和分析</p>
            </div>

            <!-- 性能统计 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-speedometer2"></i>
                        </div>
                        <div class="stat-value">85.6</div>
                        <div class="stat-label">平均性能评分</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-star"></i>
                        </div>
                        <div class="stat-value">89</div>
                        <div class="stat-label">优秀回路</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <div class="stat-value">23</div>
                        <div class="stat-label">待优化回路</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-graph-up"></i>
                        </div>
                        <div class="stat-value">15%</div>
                        <div class="stat-label">性能提升空间</div>
                    </div>
                </div>
            </div>

            <!-- 性能趋势图表 -->
            <div class="card">
                <div class="card-header">
                    <h5 class="mb-0"><i class="bi bi-graph-up"></i> 回路性能评分趋势</h5>
                </div>
                <div class="card-body">
                    <div class="chart-container" id="performanceEvaluationChart"></div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
        this.initPerformanceEvaluationChart();
    }

    initPerformanceEvaluationChart() {
        const chart = echarts.init(document.getElementById('performanceEvaluationChart'));
        const option = {
            tooltip: {
                trigger: 'axis'
            },
            legend: {
                data: ['FC-101', 'TC-102', 'PC-103']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
            },
            yAxis: {
                type: 'value',
                min: 70,
                max: 100
            },
            series: [
                {
                    name: 'FC-101',
                    type: 'line',
                    data: [85, 87, 86, 88, 89, 87],
                    smooth: true,
                    itemStyle: { color: '#1890ff' }
                },
                {
                    name: 'TC-102',
                    type: 'line',
                    data: [92, 93, 91, 94, 92, 93],
                    smooth: true,
                    itemStyle: { color: '#52c41a' }
                },
                {
                    name: 'PC-103',
                    type: 'line',
                    data: [78, 79, 77, 80, 81, 79],
                    smooth: true,
                    itemStyle: { color: '#faad14' }
                }
            ]
        };
        chart.setOption(option);
    }

    loadComprehensiveEvaluation() {
        this.updateBreadcrumb(['首页', '综合性能评估']);

        const content = `
            <div class="page-header d-flex justify-content-between align-items-start">
                <div>
                    <h1 class="page-title">综合性能评估</h1>
                    <p class="page-description">多回路综合性能评估和对比分析，提供装置级性能洞察</p>
                </div>
                <div>
                    <button class="btn btn-primary me-2">
                        <i class="bi bi-play-circle"></i> 启动评估
                    </button>
                    <button class="btn btn-outline-secondary">
                        <i class="bi bi-gear"></i> 评估配置
                    </button>
                </div>
            </div>

            <!-- 综合性能概览 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-speedometer2"></i>
                        </div>
                        <div class="stat-value">84.2</div>
                        <div class="stat-label">综合得分</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +2.1 较上月
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <div class="stat-value">82.5</div>
                        <div class="stat-label">稳定性指数</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +1.8 较上月
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-lightning"></i>
                        </div>
                        <div class="stat-value">85.1</div>
                        <div class="stat-label">响应性指数</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +0.9 较上月
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-bullseye"></i>
                        </div>
                        <div class="stat-value">84.8</div>
                        <div class="stat-label">准确性指数</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +1.2 较上月
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- 装置性能分布 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-pie-chart"></i> 装置性能分布</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container" id="plantPerformanceDistribution" style="height: 300px;"></div>
                        </div>
                    </div>
                </div>

                <!-- 性能趋势分析 -->
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-graph-up"></i> 综合性能趋势</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container" id="comprehensiveTrend" style="height: 300px;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 装置性能矩阵 -->
            <div class="row">
                <div class="col-12 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-grid"></i> 装置性能矩阵</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container" id="performanceMatrix" style="height: 400px;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- 对标分析 -->
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-bar-chart"></i> 对标分析</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>行业领先水平</span>
                                    <span class="fw-bold text-success">87.2分</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-success" style="width: 87.2%"></div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>内部目标</span>
                                    <span class="fw-bold text-primary">85.0分</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-primary" style="width: 85%"></div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>当前水平</span>
                                    <span class="fw-bold text-warning">84.2分</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-warning" style="width: 84.2%"></div>
                                </div>
                            </div>
                            <div>
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>行业平均水平</span>
                                    <span class="fw-bold text-secondary">79.5分</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-secondary" style="width: 79.5%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 改进建议 -->
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-lightbulb"></i> 改进建议</h5>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-warning mb-3">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-exclamation-triangle me-2 mt-1"></i>
                                    <div>
                                        <strong>装置B性能偏低</strong>
                                        <p class="mb-0 small">建议优化控制参数，预计可提升3.2分</p>
                                    </div>
                                </div>
                            </div>
                            <div class="alert alert-info mb-3">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-info-circle me-2 mt-1"></i>
                                    <div>
                                        <strong>响应性有提升空间</strong>
                                        <p class="mb-0 small">建议调整控制器参数，减少响应延迟</p>
                                    </div>
                                </div>
                            </div>
                            <div class="alert alert-success mb-0">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-check-circle me-2 mt-1"></i>
                                    <div>
                                        <strong>装置A表现优秀</strong>
                                        <p class="mb-0 small">可作为最佳实践推广到其他装置</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
        this.initComprehensiveEvaluationCharts();
    }

    initComprehensiveEvaluationCharts() {
        // 装置性能分布饼图
        const distributionChart = echarts.init(document.getElementById('plantPerformanceDistribution'));
        const distributionOption = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c}个 ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'middle'
            },
            series: [
                {
                    name: '装置性能',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['60%', '50%'],
                    data: [
                        { value: 2, name: '优秀 (≥90分)', itemStyle: { color: '#52c41a' } },
                        { value: 4, name: '良好 (80-90分)', itemStyle: { color: '#1890ff' } },
                        { value: 2, name: '一般 (70-80分)', itemStyle: { color: '#faad14' } },
                        { value: 1, name: '较差 (<70分)', itemStyle: { color: '#f5222d' } }
                    ]
                }
            ]
        };
        distributionChart.setOption(distributionOption);

        // 综合性能趋势图
        const trendChart = echarts.init(document.getElementById('comprehensiveTrend'));
        const trendOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: ['综合得分', '稳定性', '响应性', '准确性']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: ['1月', '2月', '3月', '4月', '5月', '6月']
            },
            yAxis: {
                type: 'value',
                min: 75,
                max: 90
            },
            series: [
                {
                    name: '综合得分',
                    type: 'line',
                    data: [82.1, 82.8, 83.2, 83.8, 84.0, 84.2],
                    smooth: true,
                    itemStyle: { color: '#1890ff' }
                },
                {
                    name: '稳定性',
                    type: 'line',
                    data: [80.7, 81.2, 81.8, 82.1, 82.3, 82.5],
                    smooth: true,
                    itemStyle: { color: '#52c41a' }
                },
                {
                    name: '响应性',
                    type: 'line',
                    data: [84.2, 84.5, 84.8, 85.0, 85.1, 85.1],
                    smooth: true,
                    itemStyle: { color: '#faad14' }
                },
                {
                    name: '准确性',
                    type: 'line',
                    data: [83.6, 83.9, 84.2, 84.5, 84.7, 84.8],
                    smooth: true,
                    itemStyle: { color: '#722ed1' }
                }
            ]
        };
        trendChart.setOption(trendOption);

        // 装置性能矩阵热力图
        const matrixChart = echarts.init(document.getElementById('performanceMatrix'));
        const plants = ['装置A', '装置B', '装置C', '装置D', '装置E'];
        const metrics = ['稳定性', '响应性', '准确性', '效率性', '安全性'];
        const matrixData = [];

        for (let i = 0; i < plants.length; i++) {
            for (let j = 0; j < metrics.length; j++) {
                const value = Math.floor(Math.random() * 30) + 70; // 70-100分
                matrixData.push([i, j, value]);
            }
        }

        const matrixOption = {
            tooltip: {
                position: 'top',
                formatter: function (params) {
                    return plants[params.data[0]] + ' - ' + metrics[params.data[1]] + ': ' + params.data[2] + '分';
                }
            },
            grid: {
                height: '60%',
                top: '10%'
            },
            xAxis: {
                type: 'category',
                data: plants,
                splitArea: {
                    show: true
                }
            },
            yAxis: {
                type: 'category',
                data: metrics,
                splitArea: {
                    show: true
                }
            },
            visualMap: {
                min: 70,
                max: 100,
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '5%',
                inRange: {
                    color: ['#f5222d', '#faad14', '#52c41a']
                }
            },
            series: [{
                name: '性能得分',
                type: 'heatmap',
                data: matrixData,
                label: {
                    show: true,
                    formatter: '{c}'
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }]
        };
        matrixChart.setOption(matrixOption);

        // 响应式处理
        window.addEventListener('resize', () => {
            distributionChart.resize();
            trendChart.resize();
            matrixChart.resize();
        });
    }

    loadPerformanceDiagnosis() {
        this.updateBreadcrumb(['首页', '性能诊断']);

        const content = `
            <div class="page-header d-flex justify-content-between align-items-start">
                <div>
                    <h1 class="page-title">性能诊断</h1>
                    <p class="page-description">智能诊断控制系统性能问题，提供根因分析和优化建议</p>
                </div>
                <div>
                    <button class="btn btn-primary me-2">
                        <i class="bi bi-play-circle"></i> 启动诊断
                    </button>
                    <button class="btn btn-outline-secondary">
                        <i class="bi bi-gear"></i> 诊断配置
                    </button>
                </div>
            </div>

            <!-- 诊断状态概览 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-exclamation-triangle"></i>
                        </div>
                        <div class="stat-value">12</div>
                        <div class="stat-label">活跃告警</div>
                        <div class="stat-trend">紧急: 3 | 一般: 9</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-clock"></i>
                        </div>
                        <div class="stat-value">5</div>
                        <div class="stat-label">诊断进行中</div>
                        <div class="stat-trend">预计完成: 15分钟</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <div class="stat-value">87.5%</div>
                        <div class="stat-label">系统健康度</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +2.1% 较昨日
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-graph-up"></i>
                        </div>
                        <div class="stat-value">24</div>
                        <div class="stat-label">今日已处理</div>
                        <div class="stat-trend">解决率: 91.7%</div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- 告警中心 -->
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-bell"></i> 告警中心</h5>
                            <span class="badge bg-danger">12个活跃</span>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6 class="text-danger">紧急告警</h6>
                                <div class="alert alert-danger alert-sm mb-2">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>反应器温度异常</strong>
                                            <br><small>TC-101温度超出安全范围</small>
                                        </div>
                                        <small>2分钟前</small>
                                    </div>
                                </div>
                                <div class="alert alert-danger alert-sm mb-2">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>压力控制失效</strong>
                                            <br><small>PC-205压力控制器无响应</small>
                                        </div>
                                        <small>5分钟前</small>
                                    </div>
                                </div>
                                <div class="alert alert-danger alert-sm">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>安全联锁触发</strong>
                                            <br><small>SIS-301安全系统激活</small>
                                        </div>
                                        <small>8分钟前</small>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h6 class="text-warning">一般告警</h6>
                                <div class="alert alert-warning alert-sm mb-2">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>控制精度下降</strong>
                                            <br><small>FC-102流量控制精度偏低</small>
                                        </div>
                                        <small>10分钟前</small>
                                    </div>
                                </div>
                                <div class="alert alert-warning alert-sm">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div>
                                            <strong>能耗效率异常</strong>
                                            <br><small>装置B能耗超出预期15%</small>
                                        </div>
                                        <small>15分钟前</small>
                                    </div>
                                </div>
                            </div>

                            <div class="text-center mt-3">
                                <button class="btn btn-outline-primary btn-sm">查看全部告警</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 诊断工具 -->
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-tools"></i> 诊断工具</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-6 mb-3">
                                    <div class="card border-primary">
                                        <div class="card-body text-center p-3">
                                            <i class="bi bi-search text-primary" style="font-size: 24px;"></i>
                                            <h6 class="mt-2 mb-1">故障检测</h6>
                                            <small class="text-muted">自动检测系统异常</small>
                                            <div class="mt-2">
                                                <button class="btn btn-primary btn-sm">启动检测</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6 mb-3">
                                    <div class="card border-success">
                                        <div class="card-body text-center p-3">
                                            <i class="bi bi-diagram-3 text-success" style="font-size: 24px;"></i>
                                            <h6 class="mt-2 mb-1">根因分析</h6>
                                            <small class="text-muted">深度分析故障原因</small>
                                            <div class="mt-2">
                                                <button class="btn btn-success btn-sm">分析向导</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6 mb-3">
                                    <div class="card border-warning">
                                        <div class="card-body text-center p-3">
                                            <i class="bi bi-lightbulb text-warning" style="font-size: 24px;"></i>
                                            <h6 class="mt-2 mb-1">优化建议</h6>
                                            <small class="text-muted">智能优化建议</small>
                                            <div class="mt-2">
                                                <button class="btn btn-warning btn-sm">获取建议</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6 mb-3">
                                    <div class="card border-info">
                                        <div class="card-body text-center p-3">
                                            <i class="bi bi-file-text text-info" style="font-size: 24px;"></i>
                                            <h6 class="mt-2 mb-1">诊断报告</h6>
                                            <small class="text-muted">生成详细报告</small>
                                            <div class="mt-2">
                                                <button class="btn btn-info btn-sm">生成报告</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 诊断历史和知识库 -->
            <div class="row">
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-clock-history"></i> 最近诊断活动</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>时间</th>
                                            <th>诊断对象</th>
                                            <th>问题类型</th>
                                            <th>状态</th>
                                            <th>处理结果</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>14:30</td>
                                            <td>TC-101</td>
                                            <td>温度异常</td>
                                            <td><span class="status-badge warning">处理中</span></td>
                                            <td>根因分析进行中</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary">查看</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>14:15</td>
                                            <td>FC-205</td>
                                            <td>控制失效</td>
                                            <td><span class="status-badge online">已解决</span></td>
                                            <td>参数调整完成</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary">查看</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>13:45</td>
                                            <td>PC-301</td>
                                            <td>压力波动</td>
                                            <td><span class="status-badge online">已解决</span></td>
                                            <td>控制器重新调优</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary">查看</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 知识库快速访问 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-book"></i> 诊断知识库</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6>常见问题解决方案</h6>
                                <ul class="list-unstyled">
                                    <li><a href="#" class="text-decoration-none">温度控制器故障处理</a></li>
                                    <li><a href="#" class="text-decoration-none">压力控制失效分析</a></li>
                                    <li><a href="#" class="text-decoration-none">流量控制精度问题</a></li>
                                    <li><a href="#" class="text-decoration-none">安全联锁误动作</a></li>
                                </ul>
                            </div>
                            <div class="mb-3">
                                <h6>专家经验库</h6>
                                <ul class="list-unstyled">
                                    <li><a href="#" class="text-decoration-none">控制器参数调优指南</a></li>
                                    <li><a href="#" class="text-decoration-none">设备维护最佳实践</a></li>
                                    <li><a href="#" class="text-decoration-none">故障预防措施</a></li>
                                </ul>
                            </div>
                            <div class="text-center">
                                <button class="btn btn-outline-primary btn-sm">访问完整知识库</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
    }

    loadPerformanceOptimization() {
        this.updateBreadcrumb(['首页', '性能优化辅助']);

        const content = `
            <div class="page-header d-flex justify-content-between align-items-start">
                <div>
                    <h1 class="page-title">性能优化辅助</h1>
                    <p class="page-description">智能优化建议和参数调优，提升控制系统整体性能</p>
                </div>
                <div>
                    <button class="btn btn-primary me-2">
                        <i class="bi bi-play-circle"></i> 启动优化
                    </button>
                    <button class="btn btn-outline-secondary">
                        <i class="bi bi-gear"></i> 优化配置
                    </button>
                </div>
            </div>

            <!-- 优化概览 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-target"></i>
                        </div>
                        <div class="stat-value">23</div>
                        <div class="stat-label">待优化回路</div>
                        <div class="stat-trend">预计提升: 12.5%</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <div class="stat-value">15</div>
                        <div class="stat-label">本月已优化</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> 平均提升8.3%
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-clock"></i>
                        </div>
                        <div class="stat-value">5</div>
                        <div class="stat-label">优化进行中</div>
                        <div class="stat-trend">预计完成: 2小时</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-graph-up"></i>
                        </div>
                        <div class="stat-value">8.7%</div>
                        <div class="stat-label">整体性能提升</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> 较上月
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- 优化建议 -->
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-lightbulb"></i> 智能优化建议</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <div class="card border-warning">
                                        <div class="card-header bg-warning bg-opacity-10">
                                            <h6 class="mb-0 text-warning">
                                                <i class="bi bi-exclamation-triangle"></i> 高优先级
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <h6>TC-101温度控制器</h6>
                                            <p class="small text-muted mb-2">当前性能: 72.3分</p>
                                            <p class="small mb-3">建议调整PID参数，预计提升至85.1分</p>
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="badge bg-warning">预计收益: +12.8分</span>
                                                <button class="btn btn-warning btn-sm">立即优化</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <div class="card border-info">
                                        <div class="card-header bg-info bg-opacity-10">
                                            <h6 class="mb-0 text-info">
                                                <i class="bi bi-info-circle"></i> 中优先级
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <h6>FC-205流量控制器</h6>
                                            <p class="small text-muted mb-2">当前性能: 78.9分</p>
                                            <p class="small mb-3">建议优化控制算法，减少超调</p>
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="badge bg-info">预计收益: +6.2分</span>
                                                <button class="btn btn-info btn-sm">查看详情</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <div class="card border-success">
                                        <div class="card-header bg-success bg-opacity-10">
                                            <h6 class="mb-0 text-success">
                                                <i class="bi bi-check-circle"></i> 低优先级
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <h6>PC-301压力控制器</h6>
                                            <p class="small text-muted mb-2">当前性能: 83.5分</p>
                                            <p class="small mb-3">建议微调设定值，提升稳定性</p>
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="badge bg-success">预计收益: +3.1分</span>
                                                <button class="btn btn-success btn-sm">计划优化</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <div class="card border-primary">
                                        <div class="card-header bg-primary bg-opacity-10">
                                            <h6 class="mb-0 text-primary">
                                                <i class="bi bi-star"></i> 推荐优化
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <h6>装置级协调控制</h6>
                                            <p class="small text-muted mb-2">整体协调性: 76.8分</p>
                                            <p class="small mb-3">建议启用多变量控制策略</p>
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="badge bg-primary">预计收益: +15.3分</span>
                                                <button class="btn btn-primary btn-sm">评估方案</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 优化工具 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-tools"></i> 优化工具</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-3">
                                <button class="btn btn-outline-primary">
                                    <i class="bi bi-sliders"></i> 参数自动调优
                                </button>
                                <button class="btn btn-outline-success">
                                    <i class="bi bi-diagram-3"></i> 控制策略优化
                                </button>
                                <button class="btn btn-outline-warning">
                                    <i class="bi bi-graph-up"></i> 性能基准设定
                                </button>
                                <button class="btn btn-outline-info">
                                    <i class="bi bi-clipboard-data"></i> 优化效果评估
                                </button>
                                <button class="btn btn-outline-secondary">
                                    <i class="bi bi-book"></i> 优化案例库
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 优化进度和历史 -->
            <div class="row">
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-clock-history"></i> 优化进度跟踪</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>优化对象</th>
                                            <th>优化类型</th>
                                            <th>开始时间</th>
                                            <th>进度</th>
                                            <th>预期效果</th>
                                            <th>状态</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>TC-101</td>
                                            <td>PID调优</td>
                                            <td>14:30</td>
                                            <td>
                                                <div class="progress" style="height: 6px;">
                                                    <div class="progress-bar bg-primary" style="width: 75%"></div>
                                                </div>
                                                <small>75%</small>
                                            </td>
                                            <td>+12.8分</td>
                                            <td><span class="status-badge warning">进行中</span></td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary">监控</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>FC-205</td>
                                            <td>算法优化</td>
                                            <td>13:45</td>
                                            <td>
                                                <div class="progress" style="height: 6px;">
                                                    <div class="progress-bar bg-success" style="width: 100%"></div>
                                                </div>
                                                <small>完成</small>
                                            </td>
                                            <td>+6.2分</td>
                                            <td><span class="status-badge online">已完成</span></td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-success">查看</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>PC-301</td>
                                            <td>参数微调</td>
                                            <td>12:20</td>
                                            <td>
                                                <div class="progress" style="height: 6px;">
                                                    <div class="progress-bar bg-success" style="width: 100%"></div>
                                                </div>
                                                <small>完成</small>
                                            </td>
                                            <td>+3.1分</td>
                                            <td><span class="status-badge online">已完成</span></td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-success">查看</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 优化效果统计 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-bar-chart"></i> 优化效果统计</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>本月优化项目</span>
                                    <span class="fw-bold">15个</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-primary" style="width: 75%"></div>
                                </div>
                                <small class="text-muted">目标: 20个</small>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>平均性能提升</span>
                                    <span class="fw-bold text-success">+8.3分</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-success" style="width: 83%"></div>
                                </div>
                                <small class="text-muted">目标: +10分</small>
                            </div>
                            <div class="mb-3">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>优化成功率</span>
                                    <span class="fw-bold text-warning">91.7%</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-warning" style="width: 91.7%"></div>
                                </div>
                                <small class="text-muted">目标: 95%</small>
                            </div>
                            <div>
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <span>节能效果</span>
                                    <span class="fw-bold text-info">12.5%</span>
                                </div>
                                <div class="progress" style="height: 8px;">
                                    <div class="progress-bar bg-info" style="width: 62.5%"></div>
                                </div>
                                <small class="text-muted">目标: 20%</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
    }

    loadIntelligentCondition() {
        this.updateBreadcrumb(['首页', '智能工况识别']);

        const content = `
            <div class="page-header d-flex justify-content-between align-items-start">
                <div>
                    <h1 class="page-title">智能工况识别</h1>
                    <p class="page-description">基于AI技术的工况智能识别与分类，提供精准的工况分析</p>
                </div>
                <div>
                    <button class="btn btn-primary me-2">
                        <i class="bi bi-play-circle"></i> 启动识别
                    </button>
                    <button class="btn btn-outline-secondary">
                        <i class="bi bi-gear"></i> 模型配置
                    </button>
                </div>
            </div>

            <!-- 工况识别概览 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-cpu"></i>
                        </div>
                        <div class="stat-value">5</div>
                        <div class="stat-label">识别工况类型</div>
                        <div class="stat-trend">准确率: 94.2%</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <div class="stat-value">稳态</div>
                        <div class="stat-label">当前工况</div>
                        <div class="stat-trend">置信度: 96.8%</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-clock"></i>
                        </div>
                        <div class="stat-value">2.3h</div>
                        <div class="stat-label">工况持续时间</div>
                        <div class="stat-trend">预计持续: 4.5h</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-graph-up"></i>
                        </div>
                        <div class="stat-value">1,256</div>
                        <div class="stat-label">今日识别次数</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +12% 较昨日
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- 实时工况识别 -->
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-activity"></i> 实时工况识别</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container" id="conditionRecognition" style="height: 350px;"></div>
                        </div>
                    </div>
                </div>

                <!-- 工况分类统计 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-pie-chart"></i> 工况分布</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container" id="conditionDistribution" style="height: 350px;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 工况详情和模型状态 -->
            <div class="row">
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-list-ul"></i> 工况识别详情</h5>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>时间</th>
                                            <th>工况类型</th>
                                            <th>置信度</th>
                                            <th>持续时间</th>
                                            <th>特征参数</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>14:30</td>
                                            <td><span class="badge bg-success">稳态运行</span></td>
                                            <td>96.8%</td>
                                            <td>2.3h</td>
                                            <td>
                                                <small>温度: 稳定<br>压力: 正常</small>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>12:00</td>
                                            <td><span class="badge bg-warning">过渡状态</span></td>
                                            <td>89.2%</td>
                                            <td>0.5h</td>
                                            <td>
                                                <small>温度: 上升<br>流量: 调整</small>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>10:15</td>
                                            <td><span class="badge bg-primary">启动工况</span></td>
                                            <td>94.5%</td>
                                            <td>1.8h</td>
                                            <td>
                                                <small>温度: 升温<br>压力: 建立</small>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>08:30</td>
                                            <td><span class="badge bg-secondary">停车准备</span></td>
                                            <td>91.3%</td>
                                            <td>0.3h</td>
                                            <td>
                                                <small>流量: 减少<br>温度: 降低</small>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- AI模型状态 -->
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-robot"></i> AI模型状态</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-4">
                                <h6>模型性能指标</h6>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span>识别准确率</span>
                                        <span class="fw-bold text-success">94.2%</span>
                                    </div>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar bg-success" style="width: 94.2%"></div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span>响应速度</span>
                                        <span class="fw-bold text-primary">0.8s</span>
                                    </div>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar bg-primary" style="width: 85%"></div>
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <span>模型稳定性</span>
                                        <span class="fw-bold text-warning">92.7%</span>
                                    </div>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar bg-warning" style="width: 92.7%"></div>
                                    </div>
                                </div>
                            </div>

                            <div class="mb-4">
                                <h6>训练数据状态</h6>
                                <div class="row text-center">
                                    <div class="col-4">
                                        <div class="fw-bold">15,680</div>
                                        <small class="text-muted">训练样本</small>
                                    </div>
                                    <div class="col-4">
                                        <div class="fw-bold">2,340</div>
                                        <small class="text-muted">验证样本</small>
                                    </div>
                                    <div class="col-4">
                                        <div class="fw-bold">98.5%</div>
                                        <small class="text-muted">数据质量</small>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h6>模型操作</h6>
                                <div class="d-grid gap-2">
                                    <button class="btn btn-outline-primary btn-sm">
                                        <i class="bi bi-arrow-clockwise"></i> 重新训练
                                    </button>
                                    <button class="btn btn-outline-success btn-sm">
                                        <i class="bi bi-download"></i> 导出模型
                                    </button>
                                    <button class="btn btn-outline-warning btn-sm">
                                        <i class="bi bi-gear"></i> 参数调优
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 工况预测和告警 -->
            <div class="row">
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-graph-up"></i> 工况预测趋势</h5>
                        </div>
                        <div class="card-body">
                            <div class="chart-container" id="conditionPrediction" style="height: 300px;"></div>
                        </div>
                    </div>
                </div>

                <!-- 工况告警 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-bell"></i> 工况告警</h5>
                        </div>
                        <div class="card-body">
                            <div class="alert alert-warning mb-3">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-exclamation-triangle me-2 mt-1"></i>
                                    <div>
                                        <strong>工况切换预警</strong>
                                        <p class="mb-0 small">预计30分钟后进入过渡状态</p>
                                        <small class="text-muted">置信度: 87.3%</small>
                                    </div>
                                </div>
                            </div>
                            <div class="alert alert-info mb-3">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-info-circle me-2 mt-1"></i>
                                    <div>
                                        <strong>异常工况检测</strong>
                                        <p class="mb-0 small">检测到非典型运行模式</p>
                                        <small class="text-muted">建议人工确认</small>
                                    </div>
                                </div>
                            </div>
                            <div class="alert alert-success mb-0">
                                <div class="d-flex align-items-start">
                                    <i class="bi bi-check-circle me-2 mt-1"></i>
                                    <div>
                                        <strong>稳态运行确认</strong>
                                        <p class="mb-0 small">当前工况稳定，运行正常</p>
                                        <small class="text-muted">持续时间: 2.3小时</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
        this.initIntelligentConditionCharts();
    }

    initIntelligentConditionCharts() {
        // 实时工况识别图表
        const recognitionChart = echarts.init(document.getElementById('conditionRecognition'));
        const recognitionOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: ['置信度', '工况类型']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: Array.from({ length: 24 }, (_, i) => {
                    const hour = i;
                    return hour.toString().padStart(2, '0') + ':00';
                })
            },
            yAxis: [
                {
                    type: 'value',
                    name: '置信度(%)',
                    min: 80,
                    max: 100
                },
                {
                    type: 'value',
                    name: '工况编码',
                    min: 0,
                    max: 5,
                    position: 'right'
                }
            ],
            series: [
                {
                    name: '置信度',
                    type: 'line',
                    data: Array.from({ length: 24 }, () => Math.random() * 15 + 85),
                    smooth: true,
                    itemStyle: { color: '#1890ff' }
                },
                {
                    name: '工况类型',
                    type: 'line',
                    yAxisIndex: 1,
                    data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 4) + 1),
                    step: 'end',
                    itemStyle: { color: '#52c41a' }
                }
            ]
        };
        recognitionChart.setOption(recognitionOption);

        // 工况分布饼图
        const distributionChart = echarts.init(document.getElementById('conditionDistribution'));
        const distributionOption = {
            tooltip: {
                trigger: 'item',
                formatter: '{a} <br/>{b}: {c}h ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                top: 'middle'
            },
            series: [
                {
                    name: '工况分布',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['60%', '50%'],
                    data: [
                        { value: 12.5, name: '稳态运行', itemStyle: { color: '#52c41a' } },
                        { value: 6.2, name: '启动工况', itemStyle: { color: '#1890ff' } },
                        { value: 3.8, name: '过渡状态', itemStyle: { color: '#faad14' } },
                        { value: 1.2, name: '停车准备', itemStyle: { color: '#722ed1' } },
                        { value: 0.3, name: '异常工况', itemStyle: { color: '#f5222d' } }
                    ]
                }
            ]
        };
        distributionChart.setOption(distributionOption);

        // 工况预测趋势图
        const predictionChart = echarts.init(document.getElementById('conditionPrediction'));
        const predictionOption = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' }
            },
            legend: {
                data: ['历史工况', '预测工况', '置信区间']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: Array.from({ length: 12 }, (_, i) => {
                    const now = new Date();
                    now.setHours(now.getHours() + i - 6);
                    return now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                })
            },
            yAxis: {
                type: 'value',
                name: '工况类型',
                min: 0,
                max: 5
            },
            series: [
                {
                    name: '历史工况',
                    type: 'line',
                    data: [2, 2, 2, 3, 3, 2, null, null, null, null, null, null],
                    step: 'end',
                    itemStyle: { color: '#1890ff' }
                },
                {
                    name: '预测工况',
                    type: 'line',
                    data: [null, null, null, null, null, 2, 2, 3, 3, 2, 2, 1],
                    step: 'end',
                    itemStyle: { color: '#52c41a' },
                    lineStyle: { type: 'dashed' }
                }
            ]
        };
        predictionChart.setOption(predictionOption);

        // 响应式处理
        window.addEventListener('resize', () => {
            recognitionChart.resize();
            distributionChart.resize();
            predictionChart.resize();
        });
    }

    loadReportsVisualization() {
        this.updateBreadcrumb(['首页', '报表与可视化']);

        const content = `
            <div class="page-header d-flex justify-content-between align-items-start">
                <div>
                    <h1 class="page-title">报表与可视化</h1>
                    <p class="page-description">数据报表生成和可视化展示，提供多维度的数据分析视图</p>
                </div>
                <div>
                    <button class="btn btn-primary me-2">
                        <i class="bi bi-plus"></i> 创建报表
                    </button>
                    <button class="btn btn-outline-secondary">
                        <i class="bi bi-gear"></i> 报表配置
                    </button>
                </div>
            </div>

            <!-- 报表概览 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-file-text"></i>
                        </div>
                        <div class="stat-value">28</div>
                        <div class="stat-label">报表模板</div>
                        <div class="stat-trend">活跃: 15个</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-graph-up"></i>
                        </div>
                        <div class="stat-value">156</div>
                        <div class="stat-label">本月生成</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +23% 较上月
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-eye"></i>
                        </div>
                        <div class="stat-value">2,340</div>
                        <div class="stat-label">总浏览量</div>
                        <div class="stat-trend">日均: 78次</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-download"></i>
                        </div>
                        <div class="stat-value">89</div>
                        <div class="stat-label">本月下载</div>
                        <div class="stat-trend">PDF: 45 | Excel: 44</div>
                    </div>
                </div>
            </div>

            <!-- 快速报表生成 -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-lightning"></i> 快速报表生成</h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-lg-3 col-md-6 mb-3">
                                    <div class="card border-primary h-100">
                                        <div class="card-body text-center">
                                            <i class="bi bi-speedometer2 text-primary" style="font-size: 32px;"></i>
                                            <h6 class="mt-3 mb-2">性能日报</h6>
                                            <p class="small text-muted mb-3">系统性能指标日度汇总</p>
                                            <button class="btn btn-primary btn-sm">生成报表</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-3 col-md-6 mb-3">
                                    <div class="card border-success h-100">
                                        <div class="card-body text-center">
                                            <i class="bi bi-bar-chart text-success" style="font-size: 32px;"></i>
                                            <h6 class="mt-3 mb-2">运行周报</h6>
                                            <p class="small text-muted mb-3">装置运行状态周度分析</p>
                                            <button class="btn btn-success btn-sm">生成报表</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-3 col-md-6 mb-3">
                                    <div class="card border-warning h-100">
                                        <div class="card-body text-center">
                                            <i class="bi bi-exclamation-triangle text-warning" style="font-size: 32px;"></i>
                                            <h6 class="mt-3 mb-2">异常报告</h6>
                                            <p class="small text-muted mb-3">故障和异常事件汇总</p>
                                            <button class="btn btn-warning btn-sm">生成报表</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-lg-3 col-md-6 mb-3">
                                    <div class="card border-info h-100">
                                        <div class="card-body text-center">
                                            <i class="bi bi-graph-up text-info" style="font-size: 32px;"></i>
                                            <h6 class="mt-3 mb-2">优化报告</h6>
                                            <p class="small text-muted mb-3">性能优化效果评估</p>
                                            <button class="btn btn-info btn-sm">生成报表</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- 报表管理 -->
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-folder"></i> 报表管理</h5>
                            <div>
                                <button class="btn btn-outline-primary btn-sm me-2">
                                    <i class="bi bi-funnel"></i> 筛选
                                </button>
                                <button class="btn btn-primary btn-sm">
                                    <i class="bi bi-plus"></i> 新建
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>报表名称</th>
                                            <th>类型</th>
                                            <th>创建时间</th>
                                            <th>状态</th>
                                            <th>浏览次数</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>
                                                <div>
                                                    <strong>2025年7月性能月报</strong>
                                                    <br><small class="text-muted">系统整体性能分析</small>
                                                </div>
                                            </td>
                                            <td><span class="badge bg-primary">月报</span></td>
                                            <td>2025-07-01</td>
                                            <td><span class="status-badge online">已发布</span></td>
                                            <td>156</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary me-1">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-secondary me-1">
                                                    <i class="bi bi-download"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-success">
                                                    <i class="bi bi-share"></i>
                                                </button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div>
                                                    <strong>装置A运行周报</strong>
                                                    <br><small class="text-muted">第27周运行状态分析</small>
                                                </div>
                                            </td>
                                            <td><span class="badge bg-success">周报</span></td>
                                            <td>2025-07-04</td>
                                            <td><span class="status-badge warning">生成中</span></td>
                                            <td>23</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary me-1">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-secondary me-1">
                                                    <i class="bi bi-download"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-success">
                                                    <i class="bi bi-share"></i>
                                                </button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>
                                                <div>
                                                    <strong>控制回路异常分析</strong>
                                                    <br><small class="text-muted">6月异常事件汇总</small>
                                                </div>
                                            </td>
                                            <td><span class="badge bg-warning">异常报告</span></td>
                                            <td>2025-06-30</td>
                                            <td><span class="status-badge online">已发布</span></td>
                                            <td>89</td>
                                            <td>
                                                <button class="btn btn-sm btn-outline-primary me-1">
                                                    <i class="bi bi-eye"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-secondary me-1">
                                                    <i class="bi bi-download"></i>
                                                </button>
                                                <button class="btn btn-sm btn-outline-success">
                                                    <i class="bi bi-share"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 可视化仪表板 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-grid"></i> 可视化仪表板</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6>实时监控大屏</h6>
                                <div class="card border-0 bg-light">
                                    <div class="card-body text-center p-3">
                                        <i class="bi bi-display" style="font-size: 24px; color: #1890ff;"></i>
                                        <p class="small mb-2 mt-2">系统运行状态总览</p>
                                        <button class="btn btn-primary btn-sm">打开大屏</button>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <h6>性能分析看板</h6>
                                <div class="card border-0 bg-light">
                                    <div class="card-body text-center p-3">
                                        <i class="bi bi-graph-up" style="font-size: 24px; color: #52c41a;"></i>
                                        <p class="small mb-2 mt-2">多维度性能分析</p>
                                        <button class="btn btn-success btn-sm">查看看板</button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h6>自定义图表</h6>
                                <div class="card border-0 bg-light">
                                    <div class="card-body text-center p-3">
                                        <i class="bi bi-bar-chart" style="font-size: 24px; color: #faad14;"></i>
                                        <p class="small mb-2 mt-2">个性化数据展示</p>
                                        <button class="btn btn-warning btn-sm">创建图表</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 数据导出和分享 -->
            <div class="row">
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-download"></i> 数据导出</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <label class="form-label">选择数据范围</label>
                                <select class="form-select">
                                    <option>最近24小时</option>
                                    <option>最近7天</option>
                                    <option>最近30天</option>
                                    <option>自定义时间范围</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">选择数据类型</label>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" checked>
                                    <label class="form-check-label">性能指标数据</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" checked>
                                    <label class="form-check-label">告警事件数据</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox">
                                    <label class="form-check-label">操作日志数据</label>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">导出格式</label>
                                <div class="btn-group w-100" role="group">
                                    <input type="radio" class="btn-check" name="format" id="excel" checked>
                                    <label class="btn btn-outline-primary" for="excel">Excel</label>
                                    <input type="radio" class="btn-check" name="format" id="csv">
                                    <label class="btn btn-outline-primary" for="csv">CSV</label>
                                    <input type="radio" class="btn-check" name="format" id="pdf">
                                    <label class="btn btn-outline-primary" for="pdf">PDF</label>
                                </div>
                            </div>
                            <button class="btn btn-primary w-100">
                                <i class="bi bi-download"></i> 导出数据
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 报表订阅 -->
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-bell"></i> 报表订阅</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6>定期报表推送</h6>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" checked>
                                    <label class="form-check-label">每日性能简报</label>
                                    <small class="text-muted d-block">每天上午9:00推送</small>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" checked>
                                    <label class="form-check-label">周度运行报告</label>
                                    <small class="text-muted d-block">每周一上午推送</small>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox">
                                    <label class="form-check-label">月度分析报告</label>
                                    <small class="text-muted d-block">每月1日推送</small>
                                </div>
                            </div>
                            <div class="mb-3">
                                <h6>推送方式</h6>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" checked>
                                    <label class="form-check-label">邮件推送</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox">
                                    <label class="form-check-label">短信通知</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" checked>
                                    <label class="form-check-label">系统消息</label>
                                </div>
                            </div>
                            <button class="btn btn-success w-100">
                                <i class="bi bi-check"></i> 保存订阅设置
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
    }

    loadLLMAssistant() {
        this.updateBreadcrumb(['首页', 'LLM智能助手']);

        const content = `
            <div class="page-header d-flex justify-content-between align-items-start">
                <div>
                    <h1 class="page-title">LLM智能助手</h1>
                    <p class="page-description">基于大语言模型的智能问答和决策支持系统</p>
                </div>
                <div>
                    <button class="btn btn-primary me-2">
                        <i class="bi bi-chat"></i> 开始对话
                    </button>
                    <button class="btn btn-outline-secondary">
                        <i class="bi bi-gear"></i> 助手设置
                    </button>
                </div>
            </div>

            <!-- 助手概览 -->
            <div class="row mb-4">
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-chat-dots"></i>
                        </div>
                        <div class="stat-value">1,234</div>
                        <div class="stat-label">总对话次数</div>
                        <div class="stat-trend">今日: 45次</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-check-circle"></i>
                        </div>
                        <div class="stat-value">96.8%</div>
                        <div class="stat-label">问题解决率</div>
                        <div class="stat-trend up">
                            <i class="bi bi-arrow-up"></i> +2.1% 较上月
                        </div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-clock"></i>
                        </div>
                        <div class="stat-value">0.8s</div>
                        <div class="stat-label">平均响应时间</div>
                        <div class="stat-trend">最快: 0.3s</div>
                    </div>
                </div>
                <div class="col-xl-3 col-md-6 mb-4">
                    <div class="stat-card">
                        <div class="stat-icon danger">
                            <i class="bi bi-star"></i>
                        </div>
                        <div class="stat-value">4.7</div>
                        <div class="stat-label">用户满意度</div>
                        <div class="stat-trend">满分: 5.0</div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- 智能对话区 -->
                <div class="col-lg-8 mb-4">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0"><i class="bi bi-robot"></i> 智能对话</h5>
                            <div>
                                <span class="badge bg-success">在线</span>
                                <button class="btn btn-outline-secondary btn-sm ms-2">
                                    <i class="bi bi-arrow-clockwise"></i> 重置对话
                                </button>
                            </div>
                        </div>
                        <div class="card-body">
                            <div class="chat-container" style="height: 400px; overflow-y: auto; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; background: #f8f9fa;">
                                <div class="chat-message assistant mb-3">
                                    <div class="d-flex align-items-start">
                                        <div class="avatar me-3">
                                            <i class="bi bi-robot text-primary" style="font-size: 24px;"></i>
                                        </div>
                                        <div class="message-content">
                                            <div class="message-bubble bg-white p-3 rounded">
                                                <p class="mb-0">您好！我是iPDS智能助手，可以帮您解答控制系统相关问题。请问有什么可以帮助您的吗？</p>
                                            </div>
                                            <small class="text-muted">刚刚</small>
                                        </div>
                                    </div>
                                </div>

                                <div class="chat-message user mb-3">
                                    <div class="d-flex align-items-start justify-content-end">
                                        <div class="message-content me-3">
                                            <div class="message-bubble bg-primary text-white p-3 rounded">
                                                <p class="mb-0">TC-101温度控制器响应慢，应该如何处理？</p>
                                            </div>
                                            <small class="text-muted d-block text-end">2分钟前</small>
                                        </div>
                                        <div class="avatar">
                                            <i class="bi bi-person-circle text-secondary" style="font-size: 24px;"></i>
                                        </div>
                                    </div>
                                </div>

                                <div class="chat-message assistant mb-3">
                                    <div class="d-flex align-items-start">
                                        <div class="avatar me-3">
                                            <i class="bi bi-robot text-primary" style="font-size: 24px;"></i>
                                        </div>
                                        <div class="message-content">
                                            <div class="message-bubble bg-white p-3 rounded">
                                                <p class="mb-2">根据系统数据分析，TC-101温度控制器响应慢可能有以下原因：</p>
                                                <ul class="mb-2">
                                                    <li>PID参数设置不当，积分时间过大</li>
                                                    <li>执行器动作迟缓，需要检查阀门</li>
                                                    <li>传感器响应延迟，建议校验</li>
                                                </ul>
                                                <p class="mb-0">建议先检查PID参数，当前Kp=2.5, Ki=0.8, Kd=0.1，可以尝试减小积分时间到0.5。</p>
                                            </div>
                                            <small class="text-muted">2分钟前</small>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="chat-input mt-3">
                                <div class="input-group">
                                    <input type="text" class="form-control" placeholder="请输入您的问题..." id="chatInput">
                                    <button class="btn btn-primary" type="button" onclick="iPDSApp.sendMessage()">
                                        <i class="bi bi-send"></i> 发送
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 助手功能 -->
                <div class="col-lg-4 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-tools"></i> 助手功能</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-3">
                                <button class="btn btn-outline-primary">
                                    <i class="bi bi-question-circle"></i> 故障诊断助手
                                </button>
                                <button class="btn btn-outline-success">
                                    <i class="bi bi-lightbulb"></i> 优化建议助手
                                </button>
                                <button class="btn btn-outline-warning">
                                    <i class="bi bi-book"></i> 知识库查询
                                </button>
                                <button class="btn btn-outline-info">
                                    <i class="bi bi-calculator"></i> 参数计算助手
                                </button>
                                <button class="btn btn-outline-secondary">
                                    <i class="bi bi-file-text"></i> 报告生成助手
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 快速问题 -->
                    <div class="card mt-4">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-lightning"></i> 快速问题</h5>
                        </div>
                        <div class="card-body">
                            <div class="d-grid gap-2">
                                <button class="btn btn-outline-primary btn-sm text-start" onclick="iPDSApp.askQuickQuestion('如何调优PID参数？')">
                                    如何调优PID参数？
                                </button>
                                <button class="btn btn-outline-primary btn-sm text-start" onclick="iPDSApp.askQuickQuestion('控制器振荡怎么处理？')">
                                    控制器振荡怎么处理？
                                </button>
                                <button class="btn btn-outline-primary btn-sm text-start" onclick="iPDSApp.askQuickQuestion('如何提高控制精度？')">
                                    如何提高控制精度？
                                </button>
                                <button class="btn btn-outline-primary btn-sm text-start" onclick="iPDSApp.askQuickQuestion('安全联锁如何配置？')">
                                    安全联锁如何配置？
                                </button>
                                <button class="btn btn-outline-primary btn-sm text-start" onclick="iPDSApp.askQuickQuestion('能耗如何优化？')">
                                    能耗如何优化？
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 对话历史和知识库 -->
            <div class="row">
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-clock-history"></i> 最近对话</h5>
                        </div>
                        <div class="card-body">
                            <div class="list-group list-group-flush">
                                <div class="list-group-item d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="mb-1">TC-101温度控制器问题</h6>
                                        <p class="mb-1 small text-muted">讨论了PID参数调优方法</p>
                                        <small class="text-muted">2分钟前</small>
                                    </div>
                                    <button class="btn btn-outline-primary btn-sm">继续</button>
                                </div>
                                <div class="list-group-item d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="mb-1">压力控制回路优化</h6>
                                        <p class="mb-1 small text-muted">分析了PC-301性能问题</p>
                                        <small class="text-muted">1小时前</small>
                                    </div>
                                    <button class="btn btn-outline-primary btn-sm">查看</button>
                                </div>
                                <div class="list-group-item d-flex justify-content-between align-items-start">
                                    <div>
                                        <h6 class="mb-1">安全联锁配置咨询</h6>
                                        <p class="mb-1 small text-muted">讨论了SIS系统设置</p>
                                        <small class="text-muted">昨天</small>
                                    </div>
                                    <button class="btn btn-outline-primary btn-sm">查看</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 知识库推荐 -->
                <div class="col-lg-6 mb-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="bi bi-book"></i> 知识库推荐</h5>
                        </div>
                        <div class="card-body">
                            <div class="mb-3">
                                <h6>热门文档</h6>
                                <ul class="list-unstyled">
                                    <li class="mb-2">
                                        <a href="#" class="text-decoration-none">
                                            <i class="bi bi-file-text me-2"></i>PID控制器调优指南
                                        </a>
                                        <span class="badge bg-primary ms-2">热门</span>
                                    </li>
                                    <li class="mb-2">
                                        <a href="#" class="text-decoration-none">
                                            <i class="bi bi-file-text me-2"></i>控制系统故障诊断手册
                                        </a>
                                    </li>
                                    <li class="mb-2">
                                        <a href="#" class="text-decoration-none">
                                            <i class="bi bi-file-text me-2"></i>安全联锁系统设计规范
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div class="mb-3">
                                <h6>最新更新</h6>
                                <ul class="list-unstyled">
                                    <li class="mb-2">
                                        <a href="#" class="text-decoration-none">
                                            <i class="bi bi-file-text me-2"></i>智能控制算法应用案例
                                        </a>
                                        <span class="badge bg-success ms-2">新</span>
                                    </li>
                                    <li class="mb-2">
                                        <a href="#" class="text-decoration-none">
                                            <i class="bi bi-file-text me-2"></i>能耗优化最佳实践
                                        </a>
                                    </li>
                                </ul>
                            </div>
                            <div class="text-center">
                                <button class="btn btn-outline-primary btn-sm">浏览全部知识库</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        if (message) {
            // 这里可以添加发送消息的逻辑
            console.log('发送消息:', message);
            input.value = '';
            // 模拟AI回复
            setTimeout(() => {
                console.log('AI回复:', '收到您的问题，正在分析...');
            }, 1000);
        }
    }

    askQuickQuestion(question) {
        const input = document.getElementById('chatInput');
        if (input) {
            input.value = question;
            this.sendMessage();
        }
    }

    loadComingSoon(pageName) {
        const pageNames = {
            'comprehensive-evaluation': '综合性能评估',
            'performance-diagnosis': '性能诊断',
            'performance-optimization': '性能优化辅助',
            'intelligent-condition': '智能工况识别',
            'reports-visualization': '报表与可视化',
            'llm-assistant': 'LLM智能助手'
        };

        this.updateBreadcrumb(['首页', pageNames[pageName] || '功能模块']);

        const content = `
            <div class="text-center" style="padding: 100px 20px;">
                <div class="mb-4">
                    <i class="bi bi-tools" style="font-size: 80px; color: var(--text-secondary);"></i>
                </div>
                <h2 class="mb-3">${pageNames[pageName] || '功能模块'}</h2>
                <p class="text-muted mb-4">该功能模块正在开发中，敬请期待...</p>
                <button class="btn btn-primary" onclick="iPDSApp.loadPage('dashboard')">
                    <i class="bi bi-house"></i> 返回首页
                </button>
            </div>
        `;

        document.getElementById('pageContent').innerHTML = content;
    }

    handleResize() {
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.remove('show');
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.iPDSApp = new iPDSApp();
});
