export type UserRole = 'SHIPPER' | 'WAREHOUSE' | 'DISPATCHER' | 'DRIVER' | 'ADMIN'
export type VehicleApiStatus = 'MOVING' | 'STOPPED' | 'OFFLINE'
export type DeviceStatus = 'ONLINE' | 'OFFLINE'
export type CargoStatus = 'CREATED' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED'
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO'
export type AlertStatus = 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED'
export type CommandStatus = 'SENT' | 'RECEIVED' | 'EXECUTED' | 'REJECTED' | 'FAILED'

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  timestamp: string
  requestId: string
}

export interface PageResult<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PageQuery {
  page?: number
  size?: number
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface VehiclePosition extends GeoPoint {
  speed: number
  heading: number
  accuracy?: number
}

export interface UserProfile {
  id: string
  username: string
  name: string
  role: UserRole
  phone: string
  permissions: string[]
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse extends AuthTokens {
  user: UserProfile
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse extends AuthTokens {}

export interface VehicleListQuery extends PageQuery {
  status?: VehicleApiStatus
  deviceStatus?: DeviceStatus
  keyword?: string
}

export interface VehicleDto {
  plate: string
  vinTopic: string
  vehicleType: string
  capacity: number
  driverName: string
  driverPhone: string
  deviceImei: string
  deviceStatus: DeviceStatus
  status: VehicleApiStatus
  cargoId?: string
  position?: VehiclePosition
  locationDesc?: string
  registeredAt?: string
  updatedAt: string
}

export interface CreateVehicleRequest {
  plate: string
  vehicleType: string
  capacity: number
  driverName: string
  driverPhone: string
  deviceImei: string
}

export type UpdateVehicleRequest = Omit<CreateVehicleRequest, 'plate'>

export interface ActiveVehicleTask {
  plate: string
  hasActiveTask: boolean
  cargoId?: string
  cargoStatus?: CargoStatus
}

export interface LocationDto extends GeoPoint {
  name?: string
}

export interface CreateCargoRequest {
  cargoId: string
  cargoType: string
  weight: number
  origin: LocationDto
  destination: LocationDto
}

export interface CargoListQuery extends PageQuery {
  status?: CargoStatus
  keyword?: string
}

export interface CargoDto {
  cargoId: string
  cargoType: string
  weight: number
  vehiclePlate?: string
  driverName?: string
  driverPhone?: string
  status: CargoStatus
  origin: LocationDto
  destination: LocationDto
  loadedAt?: string
  eta?: string
  progress: number
  distanceTotal?: number
  distanceRemaining?: number
}

export interface UpdateCargoStatusRequest {
  status: CargoStatus
  location?: GeoPoint
  remark?: string
}

export interface CargoStatusLog {
  time: string
  status: CargoStatus
  operator: string
  remark: string
  location?: GeoPoint
}

export interface CargoPosition {
  cargoId: string
  vehiclePlate: string
  driverName: string
  position: VehiclePosition
  status: CargoStatus
  locationDesc: string
  updatedAt: string
  source: string
  deviceImei: string
}

export interface TrajectoryQuery {
  startTime?: string
  endTime?: string
  interval?: number
}

export interface TrajectoryPoint extends VehiclePosition {
  time: string
}

export interface CargoTrajectory {
  cargoId: string
  vehiclePlate: string
  startTime: string
  endTime: string
  points: TrajectoryPoint[]
}

export interface CargoEta {
  cargoId: string
  eta: string
  remainingMinutes: number
  distanceRemaining: number
  progress: number
  trend: 'ON_TRACK' | 'EARLY' | 'DELAYED'
  calculatedAt: string
}

export interface TimelineEvent {
  time: string
  type: string
  title: string
  description: string
  location?: GeoPoint
  alertId?: string
}

export interface CargoTimeline {
  cargoId: string
  events: TimelineEvent[]
}

export interface SendCommandRequest {
  commandType: 'REROUTE' | 'STOP' | 'RETURN' | string
  priority: 'LOW' | 'NORMAL' | 'HIGH'
  payload: Record<string, unknown>
}

export interface CommandDto {
  commandId: string
  plate: string
  vinTopic?: string
  mqttTopic?: string
  commandType: string
  priority: string
  payload?: Record<string, unknown>
  status: CommandStatus
  createdAt?: string
  timeline?: Array<{ time: string; status: CommandStatus; source: string }>
}

export interface AlertListQuery extends PageQuery {
  severity?: AlertSeverity
  type?: string
  status?: AlertStatus
  vehiclePlate?: string
}

export interface AlertDto {
  alertId: string
  alertType: string
  severity: AlertSeverity
  status: AlertStatus
  vehiclePlate: string
  cargoId?: string
  driverName?: string
  title: string
  summary?: string
  description?: string
  triggeredAt: string
  location?: GeoPoint
  logs?: Array<{ time: string; operator: string; action: string }>
}

export interface AlertStats {
  pending: Record<'critical' | 'warning' | 'info', number>
  resolvedToday: number
  totalThisMonth: number
  averageResolveTimeMinutes: number
  byType: Record<string, number>
}

export interface DeviceDto {
  imei: string
  plate: string
  status: DeviceStatus
  lastHeartbeat: string
  battery: number
  signal: number
  gnssSatellites: number
  temp: number
}

export interface DeviceStatusResult {
  devices: DeviceDto[]
  onlineCount: number
  offlineCount: number
  total: number
}

export interface DeviceHeartbeat {
  time: string
  status?: DeviceStatus
  battery?: number
  signal?: number
  temp?: number
}

export interface CargoDeviceEvent {
  eventId: string
  imei: string
  type: string
  time: string
  data?: Record<string, unknown>
}

export interface AssistantChatRequest {
  question: string
  sessionId?: string
  cargoId?: string
}

export interface AssistantSource {
  documentId: string
  title: string
  chunkId: string
  score: number
}

export interface AssistantChatResponse {
  sessionId: string
  answer: string
  sources: AssistantSource[]
  confidence: number
  answeredAt: string
}

export interface AssistantMessage {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}

export interface KnowledgeDocument {
  documentId: string
  title: string
  category?: string
  status: string
  objectKey?: string
  chunkCount?: number
}

export interface KnowledgeIndexResult {
  documentId: string
  status: string
  chunkCount: number
  embeddingModel: string
}

export interface HealthStatus {
  status: string
  components?: Record<string, { status: string; details?: Record<string, unknown> }>
}
