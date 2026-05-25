"""Diagnosis-to-suggestion mapping — translates fault detection results
into actionable Chinese-language optimization recommendations."""

SUGGESTION_MAP = {
    ("stiction", "high"): {
        "title": "阀门粘滞",
        "diagnosis": "输出值变化不引起被控变量相应变化，存在粘滞-滑动现象",
        "causes": [
            "阀门定位器响应滞后或气源压力不足",
            "阀杆/阀芯存在机械卡涩或摩擦力过大",
            "填料函过紧导致阀杆运动阻力大",
        ],
        "suggestions": [
            "检查阀门定位器与执行机构，确认气源压力正常",
            "考虑增加最小阀位变化死区（deadband），减少频繁微小动作",
            "安排阀门检修计划，检查阀杆润滑和填料状态",
            "如粘滞系数持续>0.5，建议安排在下次停车时解体检查",
        ],
    },
    ("oscillation", "high"): {
        "title": "回路振荡",
        "diagnosis": "被控变量存在有规律的周期性波动，可能由整定不当或外部干扰引起",
        "causes": [
            "PID参数整定过强（比例增益过大或积分时间过短）",
            "外部周期性扰动（如上游压力/流量波动）",
            "阀门粘滞引起的极限环振荡",
        ],
        "suggestions": [
            "尝试降低比例增益Kc至当前值的70%或增大积分时间Ti至当前值的1.5倍",
            "通过趋势图确认振荡是否与外部扰动同步",
            "若由阀门粘滞引起，优先处理粘滞问题",
            "使用IMC整定或Lambda整定重新计算PID参数",
        ],
    },
    ("nonlinearity", "high"): {
        "title": "过程非线性",
        "diagnosis": "被控变量与控制输出之间的关系偏离线性，不同操作区间响应特性差异大",
        "causes": [
            "过程本身具有强非线性特性（如pH控制、反应器温度控制）",
            "控制阀流量特性与工艺不匹配",
            "操作点频繁变动导致过程增益变化",
        ],
        "suggestions": [
            "考虑按负荷分段整定，在不同操作区间使用不同PID参数",
            "检查控制阀的固有流量特性，评估是否需要更换阀芯",
            "在常用操作区间内优先优化PID参数",
            "如条件允许，考虑增加非线性补偿（如增益调度）",
        ],
    },
    ("saturation", "high"): {
        "title": "输出饱和",
        "diagnosis": "控制器输出长时间处于上限或下限限位，控制作用失效",
        "causes": [
            "调节阀选型偏小/偏大，无法满足工艺需求",
            "控制器积分饱和（integral windup）",
            "工艺负荷超出设计范围",
        ],
        "suggestions": [
            "检查阀门/执行器选型是否匹配当前工况",
            "确认控制器已启用抗积分饱和功能（anti-windup）",
            "评估是否需要调整操作点或增/减负荷",
            "若为间歇性饱和，可适当放宽输出限位设定",
        ],
    },
    ("coupling", "high"): {
        "title": "回路耦合",
        "diagnosis": "当前回路与相邻回路存在较强的相互影响，单独调节效果不佳",
        "causes": [
            "工艺设计上多个回路通过物料/能量流相互关联",
            "相邻回路的整定参数冲突",
            "缺乏前馈补偿机制",
        ],
        "suggestions": [
            "先整定主导回路（影响最大的回路），再整定从属回路",
            "避免同时修改多个耦合回路的PID参数",
            "评估是否可增加前馈控制（feedforward）解耦",
            "如耦合非常严重，考虑在DCS中实施解耦控制器",
        ],
    },
}


def get_suggestions(primary_fault: str, confidence: float) -> dict:
    """Return diagnosis suggestions for a loop based on primary fault type."""
    key = (primary_fault, "high") if confidence >= 0.5 else (primary_fault, "low")
    entry = SUGGESTION_MAP.get(key)
    if not entry:
        return {
            "title": "无明显故障",
            "diagnosis": "回路当前运行正常，各项指标处于可接受范围",
            "causes": [],
            "suggestions": ["继续保持当前参数运行，定期跟踪性能趋势"],
        }
    return entry
