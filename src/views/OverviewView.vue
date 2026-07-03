<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useLogisticsStore } from '@/stores/logistics'
import SmartMap from '@/components/SmartMap.vue'
import type { Vehicle } from '@/types'

const emit = defineEmits<{ navigate: [page: string] }>()
const store = useLogisticsStore()
const { vehicles, alerts, onlineCount, transitCount, pendingAlertCount } = storeToRefs(store)
const refreshedAt = ref('刚刚')

const statusLabel = { IN_TRANSIT: '行驶中', IDLE: '待命', OFFLINE: '离线' }
const trendData = [
  { day: '周一', value: 46 },
  { day: '周二', value: 61 },
  { day: '周三', value: 52 },
  { day: '周四', value: 78 },
  { day: '周五', value: 68 },
  { day: '周六', value: 88 },
  { day: '周日', value: 72 },
]
const maxTrend = computed(() => Math.max(...trendData.map((item) => item.value)))
const chartPoints = computed(() => trendData.map((item, index) => {
  const x = 42 + index * 96
  const y = 178 - (item.value / maxTrend.value) * 132
  return { ...item, x, y }
}))
const chartLine = computed(() => chartPoints.value.map((item) => `${item.x},${item.y}`).join(' '))
const chartArea = computed(() => `M42,190 L${chartLine.value.split(' ').join(' L')} L618,190 Z`)

const alertSummary = computed(() => ({
  route: alerts.value.filter((item) => item.type === 'ROUTE_DEVIATION').length,
  offline: alerts.value.filter((item) => item.type === 'DEVICE_OFFLINE').length,
  stop: alerts.value.filter((item) => item.type === 'ABNORMAL_STOP').length,
  other: alerts.value.filter((item) => !['ROUTE_DEVIATION', 'DEVICE_OFFLINE', 'ABNORMAL_STOP'].includes(item.type)).length,
}))
const alertTotal = computed(() => Object.values(alertSummary.value).reduce((sum, value) => sum + value, 0))
const donutBackground = computed(() => {
  const total = Math.max(1, alertTotal.value)
  const routeEnd = alertSummary.value.route / total * 100
  const offlineEnd = routeEnd + alertSummary.value.offline / total * 100
  const stopEnd = offlineEnd + alertSummary.value.stop / total * 100
  return `radial-gradient(circle, white 52%, transparent 53%), conic-gradient(#e84a60 0 ${routeEnd}%, #a4afba ${routeEnd}% ${offlineEnd}%, #f2b72e ${offlineEnd}% ${stopEnd}%, #3876ea ${stopEnd}% 100%)`
})

async function refresh() {
  try {
    if (store.usingDemo) store.refreshLiveData()
    else await Promise.all([store.loadVehicles(), store.loadAlerts(), store.loadDevices()])
    refreshedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    ElMessage.success('车辆位置与运营指标已刷新')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '运营数据刷新失败')
  }
}

function selectVehicle(_vehicle: Vehicle) {
  emit('navigate', 'dispatch')
}
</script>

<template>
  <div class="view-stack">
    <section class="hero-banner">
      <div>
        <span class="section-kicker">实时运营态势</span>
        <h2>下午好，调度中心</h2>
        <p>长三角区域当前运力平稳，2 项告警需要优先处理。</p>
      </div>
      <div class="hero-time">
        <span>数据刷新</span>
        <strong>{{ refreshedAt }}</strong>
        <el-button type="primary" plain icon="Refresh" @click="refresh">刷新数据</el-button>
      </div>
    </section>

    <section class="metric-grid logistics-train storybook-train" aria-label="运营核心指标">
      <article class="metric-card train-card story-engine blue">
        <span class="train-smoke"></span>
        <span class="engine-nose"></span>
        <div class="metric-icon"><el-icon><Van /></el-icon></div>
        <div><span>车辆总数</span><strong>{{ vehicles.length }}</strong><small>较昨日 +2</small></div>
        <span class="train-wheels"><i></i><i></i><i></i></span>
      </article>
      <article class="metric-card train-card story-wagon green">
        <span class="wagon-roof"></span>
        <span class="wagon-cargo"></span>
        <div class="metric-icon"><el-icon><Position /></el-icon></div>
        <div><span>在途车辆</span><strong>{{ transitCount }}</strong><small>运力利用率 78%</small></div>
        <span class="train-wheels"><i></i><i></i></span>
      </article>
      <article class="metric-card train-card story-wagon cyan">
        <span class="wagon-roof"></span>
        <span class="wagon-cargo"></span>
        <div class="metric-icon"><el-icon><Connection /></el-icon></div>
        <div><span>在线设备</span><strong>{{ onlineCount }}</strong><small>在线率 92%</small></div>
        <span class="train-wheels"><i></i><i></i></span>
      </article>
      <article class="metric-card train-card story-wagon orange" @click="emit('navigate', 'alerts')">
        <span class="wagon-roof"></span>
        <span class="wagon-cargo"></span>
        <div class="metric-icon"><el-icon><Warning /></el-icon></div>
        <div><span>待处理告警</span><strong>{{ pendingAlertCount }}</strong><small>1 项严重告警</small></div>
        <span class="train-wheels"><i></i><i></i></span>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="panel map-panel">
        <div class="panel-head">
          <div><span class="section-kicker">FLEET MAP</span><h3>长三角车辆实时分布</h3></div>
          <button class="text-button" @click="emit('navigate', 'dispatch')">查看调度台 <el-icon><ArrowRight /></el-icon></button>
        </div>
        <SmartMap :vehicles="vehicles" height="315px" @select="selectVehicle" />
      </article>

      <article class="panel fleet-list-panel">
        <div class="panel-head">
          <div><span class="section-kicker">LIVE FLEET</span><h3>车辆动态</h3></div>
          <span class="live-text"><i></i>实时</span>
        </div>
        <div class="fleet-rows">
          <button v-for="vehicle in vehicles.slice(0, 4)" :key="vehicle.plate" @click="emit('navigate', 'dispatch')">
            <span class="vehicle-badge"><el-icon><Van /></el-icon></span>
            <span class="vehicle-main"><strong>{{ vehicle.plate }}</strong><small>{{ vehicle.driver }} · {{ vehicle.location }}</small></span>
            <span class="vehicle-state" :class="vehicle.status.toLowerCase()">{{ statusLabel[vehicle.status] }}</span>
            <span class="vehicle-speed">{{ vehicle.speed }}<small>km/h</small></span>
          </button>
        </div>
      </article>
    </section>

    <section class="dashboard-grid lower">
      <article class="panel">
        <div class="panel-head">
          <div><span class="section-kicker">TRANSPORT TREND</span><h3>近 7 日运输趋势</h3></div>
          <div class="trend-summary"><strong>{{ maxTrend }}</strong><span>峰值单量</span></div>
        </div>
        <div class="line-chart pro">
          <svg viewBox="0 0 660 220" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#2f6bea" stop-opacity=".28" />
                <stop offset="100%" stop-color="#2f6bea" stop-opacity=".03" />
              </linearGradient>
              <linearGradient id="trendBarFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#16a394" stop-opacity=".62" />
                <stop offset="100%" stop-color="#2f6bea" stop-opacity=".18" />
              </linearGradient>
            </defs>
            <line v-for="y in [46, 82, 118, 154, 190]" :key="y" x1="42" x2="618" :y1="y" :y2="y" class="chart-grid" />
            <rect
              v-for="item in chartPoints"
              :key="`${item.day}-bar`"
              class="trend-bar"
              :x="item.x - 18"
              :y="item.y"
              width="36"
              :height="190 - item.y"
              rx="9"
            />
            <path class="line-area" :d="chartArea" />
            <polyline class="line-path" :points="chartLine" />
            <g v-for="item in chartPoints" :key="item.day" class="trend-point">
              <circle :cx="item.x" :cy="item.y" r="6" />
              <text :x="item.x" :y="item.y - 14">{{ item.value }}</text>
            </g>
          </svg>
          <div class="line-labels"><span v-for="item in trendData" :key="item.day">{{ item.day }}</span></div>
        </div>
      </article>
      <article class="panel alert-summary">
        <div class="panel-head"><div><span class="section-kicker">ALERT OVERVIEW</span><h3>告警概览</h3></div><button class="text-button" @click="emit('navigate', 'alerts')">全部告警</button></div>
        <div class="donut-row">
          <div class="donut" :style="{ background: donutBackground }"><strong>{{ alertTotal }}</strong><span>今日告警</span></div>
          <div class="legend-list">
            <div><span><i class="danger-dot"></i>路线偏离</span><strong>{{ alertSummary.route }}</strong></div>
            <div><span><i class="gray-dot"></i>设备离线</span><strong>{{ alertSummary.offline }}</strong></div>
            <div><span><i class="warning-dot"></i>异常停车</span><strong>{{ alertSummary.stop }}</strong></div>
            <div><span><i class="blue-dot"></i>其他事件</span><strong>{{ alertSummary.other }}</strong></div>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>
