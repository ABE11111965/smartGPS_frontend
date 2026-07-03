<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLogisticsStore } from '@/stores/logistics'
import { cargoApi } from '@/services/api'
import { imageFileToDataUrl } from '@/utils/image'

const store = useLogisticsStore()
const { vehicles, cargo, devices, onlineCount } = storeToRefs(store)
const tab = ref('vehicles')
const vehicleDialog = ref(false)
const bindDialog = ref(false)
const editDialog = ref(false)
const cargoDetailDialog = ref(false)
const cargoDialog = ref(false)
const selectedCargoId = ref('')
const form = reactive({ plate: '', image: '', driver: '', phone: '', location: '上海仓储中心', vehicleType: 'TRUCK', capacity: 10, deviceImei: '' })
const editForm = reactive({ plate: '', image: '', driver: '', phone: '', location: '', vehicleType: 'TRUCK', capacity: 10, deviceImei: '' })
const newVehicleImageInput = ref<HTMLInputElement | null>(null)
const editVehicleImageInput = ref<HTMLInputElement | null>(null)
const bindForm = reactive({ cargoId: '', plate: '' })
const cargoForm = reactive({ id: '', name: '', category: '普通货物', weight: 0, origin: '', originLat: 31.2304, originLng: 121.4737, destination: '', destinationLat: 30.2741, destinationLng: 120.1551, eta: '明天 12:00' })

async function addVehicle() {
  if (!form.plate || !form.driver) return ElMessage.warning('请填写车牌和司机姓名')
  if (vehicles.value.some((item) => item.plate === form.plate)) return ElMessage.warning('该车牌已存在')
  if (!form.deviceImei) return ElMessage.warning('请填写设备 IMEI')
  try {
    await store.addVehicle({ ...form, status: 'IDLE', speed: 0, lat: 45, lng: 50, heartbeat: '刚刚' })
    if (form.image) store.setVehicleImage(form.plate, form.image)
    vehicleDialog.value = false
    Object.assign(form, { plate: '', image: '', driver: '', phone: '', location: '上海仓储中心', vehicleType: 'TRUCK', capacity: 10, deviceImei: '' })
    ElMessage.success('车辆添加成功')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '车辆添加失败') }
}

async function addCargo() {
  if (!cargoForm.name || !cargoForm.origin || !cargoForm.destination) return ElMessage.warning('请填写货物名称和运输路线')
  try {
    await store.addCargo({
    id: cargoForm.id || `YD${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${String(cargo.value.length + 1).padStart(3, '0')}`,
    name: cargoForm.name,
    category: cargoForm.category,
    origin: cargoForm.origin,
    destination: cargoForm.destination,
    progress: 0,
    status: 'CREATED',
    eta: cargoForm.eta,
    weight: cargoForm.weight,
    originLat: cargoForm.originLat,
    originLng: cargoForm.originLng,
    destinationLat: cargoForm.destinationLat,
    destinationLng: cargoForm.destinationLng,
  })
  cargoDialog.value = false
  Object.assign(cargoForm, { id: '', name: '', category: '普通货物', weight: 0, origin: '', originLat: 31.2304, originLng: 121.4737, destination: '', destinationLat: 30.2741, destinationLng: 120.1551, eta: '明天 12:00' })
  ElMessage.success('货物运单创建成功')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '货物创建失败') }
}

async function bindCargo() {
  if (!bindForm.cargoId || !bindForm.plate) return ElMessage.warning('请选择货物与车辆')
  try {
    await store.bindCargo(bindForm.cargoId, bindForm.plate)
    bindDialog.value = false
    ElMessage.success('货物与车辆绑定成功')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '绑定失败') }
}

function openBind(cargoId = '') {
  bindForm.cargoId = cargoId
  bindDialog.value = true
}

async function openCargoDetail(cargoId: string) {
  selectedCargoId.value = cargoId
  cargoDetailDialog.value = true
  if (store.usingDemo) return
  try {
    const detail = await cargoApi.detail(cargoId)
    const target = cargo.value.find((item) => item.id === cargoId)
    if (target) Object.assign(target, {
      name: detail.cargoType,
      category: detail.cargoType,
      origin: detail.origin.name || `${detail.origin.lat}, ${detail.origin.lng}`,
      destination: detail.destination.name || `${detail.destination.lat}, ${detail.destination.lng}`,
      vehiclePlate: detail.vehiclePlate,
      status: detail.status,
      progress: detail.progress,
      eta: detail.eta || '待计算',
      weight: detail.weight,
    })
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '货物详情加载失败') }
}

const selectedCargo = computed(() => cargo.value.find((item) => item.id === selectedCargoId.value))

function openEdit(plate: string) {
  const vehicle = vehicles.value.find((item) => item.plate === plate)
  if (!vehicle) return
  Object.assign(editForm, { plate: vehicle.plate, image: vehicle.image || '', driver: vehicle.driver, phone: vehicle.phone, location: vehicle.location, vehicleType: vehicle.vehicleType || 'TRUCK', capacity: vehicle.capacity || 10, deviceImei: vehicle.deviceImei || '' })
  editDialog.value = true
}

async function saveVehicle() {
  try {
    await store.updateVehicle(editForm.plate, { driver: editForm.driver, phone: editForm.phone, location: editForm.location, vehicleType: editForm.vehicleType, capacity: editForm.capacity, deviceImei: editForm.deviceImei })
    store.setVehicleImage(editForm.plate, editForm.image)
    editDialog.value = false
    ElMessage.success('车辆信息已更新')
  } catch (error) { ElMessage.error(error instanceof Error ? error.message : '车辆更新失败') }
}

async function selectVehicleImage(event: Event, target: 'new' | 'edit') {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const image = await imageFileToDataUrl(file, { maxSize: 1280 })
    if (target === 'new') form.image = image
    else editForm.image = image
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '车辆图片上传失败')
  } finally {
    input.value = ''
  }
}

async function deleteVehicle(plate: string) {
  try {
    await ElMessageBox.confirm(`确定删除车辆 ${plate} 吗？其货物绑定关系也会解除。`, '删除车辆', { type: 'warning' })
    await store.removeVehicle(plate)
    ElMessage.success('车辆已删除并解除绑定')
  } catch {
    // 用户取消操作
  }
}

async function unbind(cargoId: string) {
  try {
    await ElMessageBox.confirm(`确定解除运单 ${cargoId} 的车辆绑定吗？`, '解除绑定', { type: 'warning' })
    await store.unbindCargo(cargoId)
    ElMessage.success('绑定关系已解除')
  } catch {
    // 用户取消操作
  }
}

const statusText = { IN_TRANSIT: '运输中', IDLE: '待命', OFFLINE: '离线' }
const cargoStatus = { CREATED: '待装货', LOADED: '已装货', IN_TRANSIT: '运输中', DELIVERED: '已送达' }
</script>

<template>
  <div class="view-stack">
    <section class="filter-strip warehouse-head">
      <div><span class="section-kicker">FLEET & CARGO</span><h2>车辆与货物管理</h2><p class="muted">统一维护运输资源、绑定关系与设备在线状态。</p></div>
      <div class="filter-actions"><el-button icon="Link" @click="openBind()">绑定货物</el-button><el-button icon="Box" @click="cargoDialog = true">新建货物</el-button><el-button type="primary" icon="Plus" @click="vehicleDialog = true">新增车辆</el-button></div>
    </section>

    <section class="warehouse-stats">
      <div><span class="vehicle-badge"><el-icon><Van /></el-icon></span><p><strong>{{ vehicles.length }}</strong><span>车辆总数</span></p></div>
      <div><span class="vehicle-badge green-bg"><el-icon><Connection /></el-icon></span><p><strong>{{ onlineCount }}</strong><span>在线设备</span></p></div>
      <div><span class="vehicle-badge orange-bg"><el-icon><Box /></el-icon></span><p><strong>{{ cargo.length }}</strong><span>在库/在途货物</span></p></div>
      <div><span class="vehicle-badge purple-bg"><el-icon><Link /></el-icon></span><p><strong>{{ cargo.filter(c => c.vehiclePlate).length }}</strong><span>已绑定运单</span></p></div>
    </section>

    <section class="panel management-panel">
      <div class="management-tabs">
        <button :class="{ active: tab === 'vehicles' }" @click="tab = 'vehicles'">车辆管理</button>
        <button :class="{ active: tab === 'cargo' }" @click="tab = 'cargo'">货物与运单</button>
        <button :class="{ active: tab === 'devices' }" @click="tab = 'devices'">设备在线</button>
      </div>

      <div v-if="tab === 'vehicles'" class="data-table">
        <div class="table-row table-head"><span>车辆信息</span><span>司机</span><span>当前位置</span><span>绑定运单</span><span>设备状态</span><span>操作</span></div>
        <div v-for="vehicle in vehicles" :key="vehicle.plate" class="table-row">
          <span class="table-primary">
            <i class="vehicle-table-image">
              <img v-if="vehicle.image" :src="vehicle.image" :alt="vehicle.plate" />
              <el-icon v-else><Van /></el-icon>
            </i>
            <b>{{ vehicle.plate }}</b>
          </span>
          <span>{{ vehicle.driver }}<small>{{ vehicle.phone }}</small></span>
          <span>{{ vehicle.location }}<small>{{ vehicle.speed }} km/h</small></span>
          <span>{{ vehicle.cargoId || '暂未绑定' }}</span>
          <span><i class="online-indicator" :class="{ offline: vehicle.status === 'OFFLINE' }"></i>{{ statusText[vehicle.status] }}<small>心跳 {{ vehicle.heartbeat }}</small></span>
          <span class="row-actions"><el-button link type="primary" @click="openEdit(vehicle.plate)">编辑</el-button><el-button link type="danger" @click="deleteVehicle(vehicle.plate)">删除/解绑</el-button></span>
        </div>
        <el-empty v-if="!vehicles.length" description="暂无车辆" />
      </div>

      <div v-else-if="tab === 'cargo'" class="data-table cargo-table">
        <div class="table-row table-head"><span>运单/货物</span><span>运输路线</span><span>承运车辆</span><span>进度</span><span>状态</span><span>操作</span></div>
        <div v-for="item in cargo" :key="item.id" class="table-row">
          <span><b>{{ item.id }}</b><small>{{ item.name }} · {{ item.category }}</small></span>
          <span>{{ item.origin }}<small>→ {{ item.destination }}</small></span>
          <span>{{ item.vehiclePlate || '暂未绑定' }}</span>
          <span><el-progress :percentage="item.progress" :stroke-width="7" /></span>
          <span><span class="status-chip" :class="{ success: item.status === 'IN_TRANSIT' }">{{ cargoStatus[item.status] }}</span></span>
          <span class="row-actions"><el-button v-if="!item.vehiclePlate" link type="primary" @click="openBind(item.id)">绑定</el-button><el-button v-else link type="warning" @click="unbind(item.id)">解绑</el-button><el-button link @click="openCargoDetail(item.id)">详情</el-button></span>
        </div>
        <el-empty v-if="!cargo.length" description="暂无货物" />
      </div>

      <div v-else class="device-grid">
        <article v-for="device in devices" :key="device.imei" :class="{ offline: device.status === 'OFFLINE' }">
          <div class="device-icon"><el-icon><Monitor /></el-icon></div>
          <div><strong>{{ device.imei }}</strong><span>{{ device.plate }} · 车载定位终端</span></div>
          <span class="device-status"><i></i>{{ device.status === 'OFFLINE' ? '离线' : '在线' }}</span>
          <small>最后心跳：{{ device.lastHeartbeat }}<template v-if="device.battery != null"> · 电量 {{ device.battery }}%</template></small>
        </article>
        <el-empty v-if="!devices.length" description="暂无设备状态" />
      </div>
    </section>

    <el-dialog v-model="vehicleDialog" title="新增车辆" width="500px">
      <el-form label-position="top">
        <div class="vehicle-image-field">
          <div class="vehicle-image-preview">
            <img v-if="form.image" :src="form.image" alt="新车辆图片预览" />
            <span v-else><el-icon><Picture /></el-icon>车辆图片</span>
          </div>
          <el-button icon="Upload" @click="newVehicleImageInput?.click()">{{ form.image ? '更换图片' : '上传图片' }}</el-button>
          <input ref="newVehicleImageInput" class="file-input-hidden" type="file" accept="image/*" @change="selectVehicleImage($event, 'new')" />
        </div>
        <div class="form-grid"><el-form-item label="车牌号"><el-input v-model="form.plate" placeholder="如：沪A·C0291" /></el-form-item><el-form-item label="司机姓名"><el-input v-model="form.driver" /></el-form-item></div>
        <el-form-item label="联系电话"><el-input v-model="form.phone" /></el-form-item>
        <div class="form-grid"><el-form-item label="车辆类型"><el-input v-model="form.vehicleType" /></el-form-item><el-form-item label="载重（吨）"><el-input-number v-model="form.capacity" :min="0" /></el-form-item></div>
        <el-form-item label="设备 IMEI"><el-input v-model="form.deviceImei" /></el-form-item>
        <el-form-item label="初始位置"><el-input v-model="form.location" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="vehicleDialog = false">取消</el-button><el-button type="primary" @click="addVehicle">确认添加</el-button></template>
    </el-dialog>

    <el-dialog v-model="cargoDialog" title="新建货物运单" width="540px">
      <el-form label-position="top">
        <div class="form-grid"><el-form-item label="货物编号"><el-input v-model="cargoForm.id" placeholder="留空自动生成" /></el-form-item><el-form-item label="货物名称"><el-input v-model="cargoForm.name" /></el-form-item></div>
        <div class="form-grid"><el-form-item label="货物类型"><el-select v-model="cargoForm.category" style="width: 100%"><el-option label="普通货物" value="普通货物" /><el-option label="电子产品" value="电子产品" /><el-option label="医药冷链" value="医药冷链" /></el-select></el-form-item><el-form-item label="重量（kg）"><el-input-number v-model="cargoForm.weight" :min="0" /></el-form-item></div>
        <el-form-item label="始发地"><el-input v-model="cargoForm.origin" /></el-form-item>
        <div class="form-grid"><el-form-item label="始发纬度"><el-input-number v-model="cargoForm.originLat" :precision="6" /></el-form-item><el-form-item label="始发经度"><el-input-number v-model="cargoForm.originLng" :precision="6" /></el-form-item></div>
        <el-form-item label="目的地"><el-input v-model="cargoForm.destination" /></el-form-item>
        <div class="form-grid"><el-form-item label="目的纬度"><el-input-number v-model="cargoForm.destinationLat" :precision="6" /></el-form-item><el-form-item label="目的经度"><el-input-number v-model="cargoForm.destinationLng" :precision="6" /></el-form-item></div>
        <el-form-item label="预计到达"><el-input v-model="cargoForm.eta" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="cargoDialog = false">取消</el-button><el-button type="primary" @click="addCargo">创建运单</el-button></template>
    </el-dialog>

    <el-dialog v-model="bindDialog" title="绑定货物与车辆" width="500px">
      <el-form label-position="top">
        <el-form-item label="选择货物"><el-select v-model="bindForm.cargoId" style="width: 100%"><el-option v-for="item in cargo" :key="item.id" :label="`${item.id} · ${item.name}`" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="选择车辆"><el-select v-model="bindForm.plate" style="width: 100%"><el-option v-for="vehicle in vehicles" :key="vehicle.plate" :label="`${vehicle.plate} · ${vehicle.driver}`" :value="vehicle.plate" /></el-select></el-form-item>
      </el-form>
      <template #footer><el-button @click="bindDialog = false">取消</el-button><el-button type="primary" @click="bindCargo">确认绑定</el-button></template>
    </el-dialog>

    <el-dialog v-model="editDialog" title="编辑车辆" width="500px">
      <el-form label-position="top">
        <div class="vehicle-image-field">
          <div class="vehicle-image-preview">
            <img v-if="editForm.image" :src="editForm.image" :alt="`${editForm.plate} 图片预览`" />
            <span v-else><el-icon><Picture /></el-icon>车辆图片</span>
          </div>
          <el-button icon="Upload" @click="editVehicleImageInput?.click()">{{ editForm.image ? '更换图片' : '上传图片' }}</el-button>
          <input ref="editVehicleImageInput" class="file-input-hidden" type="file" accept="image/*" @change="selectVehicleImage($event, 'edit')" />
        </div>
        <el-form-item label="车牌号"><el-input v-model="editForm.plate" disabled /></el-form-item>
        <div class="form-grid"><el-form-item label="司机姓名"><el-input v-model="editForm.driver" /></el-form-item><el-form-item label="联系电话"><el-input v-model="editForm.phone" /></el-form-item></div>
        <div class="form-grid"><el-form-item label="车辆类型"><el-input v-model="editForm.vehicleType" /></el-form-item><el-form-item label="载重（吨）"><el-input-number v-model="editForm.capacity" :min="0" /></el-form-item></div>
        <el-form-item label="设备 IMEI"><el-input v-model="editForm.deviceImei" /></el-form-item>
        <el-form-item label="当前位置"><el-input v-model="editForm.location" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="editDialog = false">取消</el-button><el-button type="primary" @click="saveVehicle">保存修改</el-button></template>
    </el-dialog>

    <el-dialog v-model="cargoDetailDialog" title="运单详情" width="560px">
      <div v-if="selectedCargo" class="cargo-detail-dialog">
        <div class="cargo-detail-title"><span class="vehicle-badge orange-bg"><el-icon><Box /></el-icon></span><div><strong>{{ selectedCargo.name }}</strong><small>{{ selectedCargo.id }} · {{ selectedCargo.category }}</small></div><span class="status-chip success">{{ cargoStatus[selectedCargo.status] }}</span></div>
        <dl class="info-list">
          <div><dt>始发地</dt><dd>{{ selectedCargo.origin }}</dd></div>
          <div><dt>目的地</dt><dd>{{ selectedCargo.destination }}</dd></div>
          <div><dt>承运车辆</dt><dd>{{ selectedCargo.vehiclePlate || '暂未绑定' }}</dd></div>
          <div><dt>预计到达</dt><dd>{{ selectedCargo.eta }}</dd></div>
          <div><dt>运输进度</dt><dd>{{ selectedCargo.progress }}%</dd></div>
          <div><dt>收货状态</dt><dd>{{ selectedCargo.received ? '已确认收货' : '待确认' }}</dd></div>
        </dl>
      </div>
      <template #footer><el-button @click="cargoDetailDialog = false">关闭</el-button><el-button v-if="selectedCargo && !selectedCargo.vehiclePlate" type="primary" @click="cargoDetailDialog = false; openBind(selectedCargo.id)">绑定车辆</el-button></template>
    </el-dialog>
  </div>
</template>
