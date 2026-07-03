<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useLogisticsStore } from '@/stores/logistics'
import type { Vehicle } from '@/types'
import { vehicleApi } from '@/services/api'
import SmartMap from '@/components/SmartMap.vue'
import { imageFileToDataUrl } from '@/utils/image'

const store = useLogisticsStore()
const { vehicles, commands } = storeToRefs(store)
const keyword = ref('')
const status = ref('')
const selected = ref<Vehicle | null>(vehicles.value[0] || null)
const dialogVisible = ref(false)
const mapZoom = ref(100)
const command = reactive({ type: 'ROUTE_ADJUST', content: '请回到 G60 推荐路线，保持 30 秒一次心跳上报。' })
const submitting = ref(false)
const vehicleImageInput = ref<HTMLInputElement | null>(null)

const filtered = computed(() => vehicles.value.filter((item) => {
  const matchesKeyword = !keyword.value || `${item.plate}${item.driver}`.includes(keyword.value)
  return matchesKeyword && (!status.value || item.status === status.value)
}))

async function submitCommand() {
  if (!selected.value || !command.content.trim()) return
  submitting.value = true
  try {
    const type = command.type === 'ROUTE_ADJUST' ? 'REROUTE' : command.type
    await store.issueCommand(selected.value.plate, type, command.content)
    dialogVisible.value = false
    ElMessage.success(`调度指令已下发至 ${selected.value.plate}`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '指令下发失败')
  } finally {
    submitting.value = false
  }
}
const commandStatus = { SENT: '已发送', RECEIVED: '已接收', EXECUTED: '已执行', REJECTED: '已拒绝', FAILED: '失败' }

async function selectVehicle(vehicle: Vehicle) {
  selected.value = vehicle
  if (store.usingDemo) return
  try {
    const detail = await vehicleApi.detail(vehicle.plate)
    Object.assign(vehicle, {
      driver: detail.driverName,
      phone: detail.driverPhone,
      speed: detail.position?.speed || 0,
      lat: detail.position?.lat || vehicle.lat,
      lng: detail.position?.lng || vehicle.lng,
      heading: detail.position?.heading,
      location: detail.locationDesc || vehicle.location,
      heartbeat: detail.updatedAt,
      cargoId: detail.cargoId,
    })
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '车辆详情加载失败')
  }
}

function changeZoom(delta: number) {
  mapZoom.value = Math.max(80, Math.min(140, mapZoom.value + delta))
}

function contactDriver() {
  ElMessage.success(`正在呼叫 ${selected.value?.driver}（${selected.value?.phone}）`)
}

async function uploadVehicleImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !selected.value) return
  try {
    const image = await imageFileToDataUrl(file, { maxSize: 1280 })
    store.setVehicleImage(selected.value.plate, image)
    ElMessage.success(`${selected.value.plate} 的车辆图片已更新`)
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '车辆图片上传失败')
  } finally {
    input.value = ''
  }
}
</script>

<template>
  <div class="dispatch-layout">
    <section class="panel fleet-sidebar">
      <div class="panel-head"><div><span class="section-kicker">FLEET CONTROL</span><h3>车辆筛选与指令</h3></div><span>{{ filtered.length }} 辆</span></div>
      <el-input v-model="keyword" placeholder="搜索车牌 / 司机" prefix-icon="Search" clearable />
      <div class="status-tabs">
        <button :class="{ active: status === '' }" @click="status = ''">全部</button>
        <button :class="{ active: status === 'IN_TRANSIT' }" @click="status = 'IN_TRANSIT'">行驶中</button>
        <button :class="{ active: status === 'IDLE' }" @click="status = 'IDLE'">待命</button>
        <button :class="{ active: status === 'OFFLINE' }" @click="status = 'OFFLINE'">离线</button>
      </div>
      <div class="dispatch-list">
        <button v-for="vehicle in filtered" :key="vehicle.plate" :class="{ active: selected?.plate === vehicle.plate }" @click="selectVehicle(vehicle)">
          <span class="vehicle-badge"><el-icon><Van /></el-icon></span>
          <span><strong>{{ vehicle.plate }}</strong><small>{{ vehicle.driver }} · {{ vehicle.location }}</small></span>
          <i :class="vehicle.status.toLowerCase()"></i>
        </button>
        <el-empty v-if="!filtered.length" description="暂无符合条件的车辆" :image-size="72" />
      </div>
    </section>

    <section class="panel map-panel dispatch-map">
      <div class="panel-head">
        <div><span class="section-kicker">REAL-TIME FLEET</span><h3>车辆实时态势</h3></div>
        <div class="map-controls"><span>{{ mapZoom }}%</span><button @click="changeZoom(10)"><el-icon><Plus /></el-icon></button><button @click="changeZoom(-10)"><el-icon><Minus /></el-icon></button></div>
      </div>
      <SmartMap :vehicles="vehicles" :selected-plate="selected?.plate" height="580px" tooltip-style="compact" @select="selectVehicle" />
    </section>

    <aside v-if="selected" class="panel vehicle-detail">
      <div class="vehicle-photo-card">
        <img v-if="selected.image" :src="selected.image" :alt="`${selected.plate} 车辆图片`" />
        <div v-else class="vehicle-photo-empty"><el-icon><Picture /></el-icon><span>暂无车辆图片</span></div>
        <button class="vehicle-photo-action" @click="vehicleImageInput?.click()">
          <el-icon><Upload /></el-icon>{{ selected.image ? '更换图片' : '上传车辆图片' }}
        </button>
        <input ref="vehicleImageInput" class="file-input-hidden" type="file" accept="image/*" @change="uploadVehicleImage" />
      </div>
      <div class="detail-hero">
        <span class="vehicle-badge large-icon"><el-icon><Van /></el-icon></span>
        <div><span class="status-chip success">{{ selected.status === 'IN_TRANSIT' ? '行驶中' : selected.status === 'IDLE' ? '待命' : '离线' }}</span><h3>{{ selected.plate }}</h3><p>{{ selected.driver }} · {{ selected.phone }}</p></div>
      </div>
      <div class="detail-stats">
        <div><span>当前速度</span><strong>{{ selected.speed }} <small>km/h</small></strong></div>
        <div><span>设备心跳</span><strong>{{ selected.heartbeat }}</strong></div>
        <div><span>当前位置</span><strong>{{ selected.location }}</strong></div>
        <div><span>绑定运单</span><strong>{{ selected.cargoId || '暂无' }}</strong></div>
      </div>
      <div class="detail-route"><span>今日里程</span><strong>286.4 km</strong><div><i style="width: 72%"></i></div><small>日计划完成 72%</small></div>
      <button class="dispatch-push-button primary" type="button" @click="dialogVisible = true">
        <span class="push-shadow"></span>
        <span class="push-edge"></span>
        <span class="push-front"><el-icon><Promotion /></el-icon><span>下发调度指令</span></span>
      </button>
      <button class="dispatch-push-button secondary" type="button" @click="contactDriver">
        <span class="push-shadow"></span>
        <span class="push-edge"></span>
        <span class="push-front"><el-icon><Phone /></el-icon><span>联系司机</span></span>
      </button>
      <div class="receipt-preview">
        <span class="section-kicker">COMMAND RECEIPTS</span>
        <h4>最近指令回执</h4>
        <div v-for="item in commands.filter(c => c.plate === selected?.plate).slice(0, 3)" :key="item.id">
          <span><strong>{{ item.type }}</strong><small>{{ item.createdAt }}</small></span>
          <b :class="item.status.toLowerCase()">{{ commandStatus[item.status] }}</b>
        </div>
        <p v-if="!commands.some(c => c.plate === selected?.plate)">暂无调度记录</p>
      </div>
    </aside>

    <el-dialog v-model="dialogVisible" title="下发调度指令" width="480px">
      <el-form label-position="top">
        <el-form-item label="目标车辆"><el-input :model-value="selected?.plate" disabled /></el-form-item>
        <el-form-item label="指令类型">
          <el-select v-model="command.type" style="width: 100%">
            <el-option label="路线调整" value="ROUTE_ADJUST" /><el-option label="停靠指令" value="STOP" /><el-option label="返仓指令" value="RETURN" />
          </el-select>
        </el-form-item>
        <el-form-item label="调度说明"><el-input v-model="command.content" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" :loading="submitting" @click="submitCommand">下发至车载终端</el-button></template>
    </el-dialog>
  </div>
</template>
