<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { mockTimeline } from '@/data/mock'
import { useLogisticsStore } from '@/stores/logistics'
import { cargoApi } from '@/services/api'
import SmartMap from '@/components/SmartMap.vue'
import type { TimelineItem } from '@/types'

const store = useLogisticsStore()
const { cargo, vehicles } = storeToRefs(store)
const timeline = ref<TimelineItem[]>(structuredClone(mockTimeline))
const trajectory = ref<Array<{ lat: number; lng: number }>>([])
const loading = ref(false)
const loadError = ref('')
const selectedId = ref(cargo.value[0]?.id || '')
const selected = computed(() => cargo.value.find((item) => item.id === selectedId.value) || cargo.value[0])
const vehicle = computed(() => vehicles.value.find((item) => item.plate === selected.value?.vehiclePlate))
const driverInitial = computed(() => (vehicle.value?.driver || '张建国').slice(0, 1))
const driverAvatarTone = computed(() => {
  const seed = Array.from(vehicle.value?.plate || selected.value?.id || 'default').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return `tone-${seed % 4}`
})
const playback = ref(68)
const playing = ref(false)
const speed = ref(1)
const playbackPanel = ref<HTMLElement>()
const playbackCheckpoints = [
  { progress: 0, label: '上海仓', sublabel: '始发仓', icon: 'warehouse' },
  { progress: 34, label: '嘉兴枢纽', sublabel: '中转节点', icon: 'package' },
  { progress: 68, label: '运输途中', sublabel: '当前位置', icon: 'truck' },
  { progress: 100, label: '杭州仓', sublabel: '目的仓', icon: 'warehouse' },
] as const
const playbackTime = computed(() => formatPlaybackTime(Math.round(playback.value * 1.2)))
let timer: number | undefined
let fallbackTimer: number | undefined
const statusText = { CREATED: '待装货', LOADED: '已装货', IN_TRANSIT: '运输中', DELIVERED: '已送达' }
const refreshedAt = ref('12 秒前')
const trackingHeroImage = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=88'

function formatPlaybackTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

function pausePlayback() {
  playing.value = false
  window.clearInterval(timer)
}

function togglePlayback() {
  playing.value = !playing.value
  window.clearInterval(timer)
  if (playing.value) {
    if (playback.value >= 100) playback.value = 0
    timer = window.setInterval(() => {
      playback.value = Math.min(100, playback.value + speed.value)
      if (playback.value >= 100) {
        playing.value = false
        window.clearInterval(timer)
      }
    }, 180)
  }
}

function seekCheckpoint(direction: -1 | 1) {
  pausePlayback()
  const values = playbackCheckpoints.map((item) => item.progress)
  const target = direction < 0
    ? [...values].reverse().find((value) => value < playback.value)
    : values.find((value) => value > playback.value)
  playback.value = target ?? (direction < 0 ? 0 : 100)
}

async function togglePlaybackFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  } else {
    await playbackPanel.value?.requestFullscreen()
  }
}

function confirmReceipt() {
  if (!selected.value) return
  store.confirmReceipt(selected.value.id)
  ElMessage.success('收货确认成功，运单已完成')
}

async function refreshPosition(showMessage = true) {
  if (!selected.value) return
  loading.value = true
  loadError.value = ''
  try {
    if (store.usingDemo) {
      store.refreshLiveData()
      const current = vehicle.value
      if (current) trajectory.value = [
        { lat: current.lat - 18, lng: current.lng - 9 },
        { lat: current.lat - 9, lng: current.lng - 3 },
        { lat: current.lat, lng: current.lng },
      ]
      timeline.value = structuredClone(mockTimeline)
    } else {
      const [position, route, eta, timelineResult] = await Promise.all([
        cargoApi.position(selected.value.id),
        cargoApi.trajectory(selected.value.id),
        cargoApi.eta(selected.value.id),
        cargoApi.timeline(selected.value.id),
      ])
      const current = vehicles.value.find((item) => item.plate === position.vehiclePlate)
      if (current) Object.assign(current, {
        lat: position.position.lat, lng: position.position.lng, speed: position.position.speed,
        heading: position.position.heading, heartbeat: position.updatedAt, location: position.locationDesc,
      })
      trajectory.value = route.points.map((item) => ({ lat: item.lat, lng: item.lng }))
      selected.value.eta = new Date(eta.eta).toLocaleString('zh-CN')
      selected.value.progress = eta.progress
      timeline.value = timelineResult.events.map((item) => ({
        time: new Date(item.time).toLocaleString('zh-CN'),
        title: item.title,
        description: item.description,
        active: Boolean(item.alertId),
      }))
    }
    refreshedAt.value = '刚刚'
    if (showMessage) ElMessage.success('实时位置、ETA 与轨迹已刷新')
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '追踪数据加载失败'
    if (showMessage) ElMessage.error(loadError.value)
  } finally {
    loading.value = false
  }
}

function contactDriver() {
  ElMessage.success(`正在呼叫 ${vehicle.value?.driver || '承运司机'}（${vehicle.value?.phone || '暂无号码'}）`)
}

function configureFallback() {
  window.clearInterval(fallbackTimer)
  if (!store.usingDemo && store.realtimeState !== 'open') {
    fallbackTimer = window.setInterval(() => void refreshPosition(false), 15_000)
  }
}

onMounted(() => void refreshPosition(false))
watch(selectedId, () => void refreshPosition(false))
watch(() => store.realtimeState, configureFallback, { immediate: true })
onUnmounted(() => {
  window.clearInterval(timer)
  window.clearInterval(fallbackTimer)
})
</script>

<template>
  <div class="view-stack tracking-v6-page">
    <section class="filter-strip">
      <div>
        <span class="section-kicker">CARGO TRACKING</span>
        <h2>全链路在途监控</h2>
      </div>
      <div class="filter-actions">
        <el-select v-model="selectedId" style="width: 240px" placeholder="选择运单">
          <el-option v-for="item in cargo" :key="item.id" :label="`${item.id} · ${item.name}`" :value="item.id" />
        </el-select>
        <el-button icon="Refresh" @click="refreshPosition()">刷新位置</el-button>
      </div>
    </section>

    <section v-if="selected" class="tracking-layout">
      <div class="view-stack">
        <article class="panel shipment-card image-card" :style="{ '--card-image': `url(${trackingHeroImage})` }">
          <div class="shipment-top">
            <div>
              <span class="status-chip success">{{ statusText[selected.status] }}</span>
              <span class="muted">运单号 {{ selected.id }}</span>
              <h3>{{ selected.name }}</h3>
              <p>{{ selected.category }} · 承运车辆 {{ selected.vehiclePlate || '暂未绑定' }}</p>
            </div>
            <div class="progress-orb" :style="{ '--progress': `${selected.progress * 3.6}deg` }">
              <div><strong>{{ selected.progress }}%</strong><span>运输进度</span></div>
            </div>
          </div>
          <div class="route-summary">
            <div><i class="route-dot start"></i><span>始发地</span><strong>{{ selected.origin }}</strong><small>今天 08:30</small></div>
            <div class="route-line"><span>预计 {{ selected.eta }} 到达</span><i></i></div>
            <div><i class="route-dot end"></i><span>目的地</span><strong>{{ selected.destination }}</strong><small>剩余约 86 km</small></div>
          </div>
        </article>

        <article class="panel map-panel tracking-map">
          <div class="panel-head">
            <div><span class="section-kicker">LIVE POSITION</span><h3>实时位置与运输轨迹</h3></div>
            <span class="live-text"><i></i>{{ refreshedAt }}更新</span>
          </div>
          <div style="position: relative">
            <div v-if="loading && !vehicle" class="state-panel">正在加载位置与轨迹…</div>
            <div v-else-if="loadError && !vehicle" class="state-panel error-panel">{{ loadError }}</div>
            <SmartMap
              v-else
              :vehicles="vehicle ? [vehicle] : vehicles"
              :selected-plate="selected.vehiclePlate"
              height="390px"
            />
            <div v-if="store.alerts.some(a => a.plate === selected.vehiclePlate && a.status === 'PENDING')" class="deviation-badge"><el-icon><Warning /></el-icon>{{ store.alerts.find(a => a.plate === selected.vehiclePlate && a.status === 'PENDING')?.title }}</div>
          </div>
          <div ref="playbackPanel" class="logistics-playback" :class="{ running: playing }">
            <div class="playback-checkpoints">
              <div
                v-for="checkpoint in playbackCheckpoints"
                :key="checkpoint.progress"
                class="playback-checkpoint"
                :class="{ passed: playback >= checkpoint.progress, current: Math.abs(playback - checkpoint.progress) < 10 }"
              >
                <strong>{{ checkpoint.label }}</strong>
                <span>{{ checkpoint.sublabel }}</span>
                <div class="checkpoint-visual" :class="checkpoint.icon" aria-hidden="true">
                  <template v-if="checkpoint.icon === 'warehouse'">
                    <i class="warehouse-roof"></i><i class="warehouse-body"></i><i class="warehouse-door"></i>
                  </template>
                  <template v-else-if="checkpoint.icon === 'package'">
                    <i class="package-box"></i><i class="package-tape"></i>
                  </template>
                  <template v-else>
                    <i class="truck-box"></i><i class="truck-cab"></i><i class="truck-wheel one"></i><i class="truck-wheel two"></i>
                  </template>
                </div>
              </div>
            </div>

            <div class="conveyor-wrap">
              <div class="conveyor-belt">
                <div class="conveyor-progress" :style="{ width: `${playback}%` }"></div>
                <div class="conveyor-rollers"></div>
                <span
                  v-for="checkpoint in playbackCheckpoints"
                  :key="`marker-${checkpoint.progress}`"
                  class="conveyor-marker"
                  :class="{ passed: playback >= checkpoint.progress }"
                  :style="{ left: `${checkpoint.progress}%` }"
                ></span>
                <div class="cargo-handle" :style="{ left: `${playback}%` }" aria-hidden="true">
                  <el-icon><Box /></el-icon>
                </div>
                <input
                  v-model.number="playback"
                  class="conveyor-range"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  aria-label="轨迹回放进度"
                  @pointerdown="pausePlayback"
                />
              </div>
            </div>

            <div class="playback-toolbar">
              <button class="playback-primary" type="button" data-testid="playback-button" :aria-label="playing ? '暂停回放' : '开始回放'" @click="togglePlayback">
                <el-icon><VideoPause v-if="playing" /><VideoPlay v-else /></el-icon>
              </button>
              <strong class="playback-time">{{ playbackTime }} <span>/ 02:00</span></strong>
              <button class="checkpoint-button" type="button" @click="seekCheckpoint(-1)">
                <el-icon><DArrowLeft /></el-icon><span>上一节点</span>
              </button>
              <button class="checkpoint-button" type="button" @click="seekCheckpoint(1)">
                <el-icon><DArrowRight /></el-icon><span>下一节点</span>
              </button>
              <div class="speed-switch" aria-label="回放速度">
                <button v-for="rate in [1, 2, 4]" :key="rate" type="button" :class="{ active: speed === rate }" @click="speed = rate">{{ rate }}×</button>
              </div>
              <button class="fullscreen-button" type="button" aria-label="全屏查看轨迹回放" @click="togglePlaybackFullscreen">
                <el-icon><FullScreen /></el-icon>
              </button>
            </div>
          </div>
        </article>
      </div>

      <aside class="view-stack">
        <article class="panel eta-card">
          <span class="section-kicker">ESTIMATED ARRIVAL</span>
          <h3>预计到达时间</h3>
          <strong class="eta-time">{{ selected.eta }}</strong>
          <div class="eta-grid">
            <div><span>剩余距离</span><strong>86 km</strong></div>
            <div><span>当前速度</span><strong>{{ vehicle?.speed || 0 }} km/h</strong></div>
          </div>
          <div class="delay-note"><el-icon><WarningFilled /></el-icon><span>受偏航影响，预计晚到约 <strong>18 分钟</strong></span></div>
        </article>

        <article class="panel">
          <div class="panel-head"><div><span class="section-kicker">TIMELINE</span><h3>运输时间线</h3></div></div>
          <div class="timeline">
            <div v-for="item in timeline" :key="`${item.time}-${item.title}`" :class="{ active: item.active }">
              <i></i>
              <span>{{ item.time }}</span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.description }}</small>
            </div>
          </div>
        </article>

        <article class="panel driver-card">
          <div class="driver-avatar large-avatar" :class="driverAvatarTone"><span>{{ driverInitial }}</span></div>
          <div><strong>{{ vehicle?.driver || '张建国' }}</strong><span>承运司机 · 驾龄 12 年 · 信用评分 98</span></div>
          <el-button circle icon="Phone" type="primary" title="联系司机" @click="contactDriver" />
        </article>
        <article v-if="selected.status === 'DELIVERED'" class="panel receipt-card">
          <div class="receipt-icon"><el-icon><GoodsFilled /></el-icon></div>
          <div><span class="section-kicker">RECEIPT</span><h3>{{ selected.received ? '已确认收货' : '货物已到达' }}</h3><p>{{ selected.received ? '该运单已完成收货确认。' : '请核对货物后完成收货确认。' }}</p></div>
          <el-button v-if="!selected.received" type="success" @click="confirmReceipt">确认收货</el-button>
          <el-icon v-else class="receipt-done"><CircleCheckFilled /></el-icon>
        </article>
      </aside>
    </section>
  </div>
</template>
