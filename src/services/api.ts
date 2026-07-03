import { apiClient } from './http'
import { tokenManager } from './token'
import type {
  ActiveVehicleTask,
  AlertDto,
  AlertListQuery,
  AlertStats,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantMessage,
  CargoDeviceEvent,
  CargoDto,
  CargoEta,
  CargoListQuery,
  CargoPosition,
  CargoStatusLog,
  CargoTimeline,
  CargoTrajectory,
  CommandDto,
  CreateCargoRequest,
  CreateVehicleRequest,
  DeviceDto,
  DeviceHeartbeat,
  DeviceStatusResult,
  HealthStatus,
  KnowledgeDocument,
  KnowledgeIndexResult,
  LoginRequest,
  LoginResponse,
  PageQuery,
  PageResult,
  SendCommandRequest,
  TrajectoryQuery,
  UpdateCargoStatusRequest,
  UpdateVehicleRequest,
  UserProfile,
  VehicleDto,
  VehicleListQuery,
} from './types'

const encode = encodeURIComponent

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const result = await apiClient.post<LoginResponse, LoginRequest>('/auth/login', payload, { skipAuth: true, skipTokenRefresh: true })
    tokenManager.save(result, result.user)
    return result
  },
  me: () => apiClient.get<UserProfile>('/users/me'),
  async logout(): Promise<void> {
    try {
      await apiClient.post<void>('/auth/logout')
    } finally {
      tokenManager.clear()
    }
  },
  refresh: () => apiClient.refreshAccessToken(),
}

export const vehicleApi = {
  list: (params: VehicleListQuery = {}) => apiClient.get<PageResult<VehicleDto>>('/vehicles', { params }),
  detail: (plate: string) => apiClient.get<VehicleDto>(`/vehicles/${encode(plate)}`),
  create: (payload: CreateVehicleRequest) => apiClient.post<Pick<VehicleDto, 'plate' | 'vinTopic' | 'registeredAt'>, CreateVehicleRequest>('/vehicles', payload),
  update: (plate: string, payload: UpdateVehicleRequest) => apiClient.put<VehicleDto, UpdateVehicleRequest>(`/vehicles/${encode(plate)}`, payload),
  remove: (plate: string) => apiClient.delete<void>(`/vehicles/${encode(plate)}`),
  activeTask: (plate: string) => apiClient.get<ActiveVehicleTask>(`/vehicles/${encode(plate)}/active-task`),
  sendCommand: (plate: string, payload: SendCommandRequest) => apiClient.post<CommandDto, SendCommandRequest>(`/vehicles/${encode(plate)}/command`, payload),
  commandStatus: (plate: string, commandId: string) => apiClient.get<CommandDto>(`/vehicles/${encode(plate)}/command/${encode(commandId)}`),
  commands: (plate: string, params: PageQuery = {}) => apiClient.get<PageResult<CommandDto>>(`/vehicles/${encode(plate)}/commands`, { params }),
}

export const cargoApi = {
  list: (params: CargoListQuery = {}) => apiClient.get<PageResult<CargoDto>>('/cargo', { params }),
  create: (payload: CreateCargoRequest) => apiClient.post<CargoDto, CreateCargoRequest>('/cargo', payload),
  detail: (cargoId: string) => apiClient.get<CargoDto>(`/cargo/${encode(cargoId)}`),
  bind: (cargoId: string, plate: string) => apiClient.post<void, { cargoId: string; plate: string }>('/cargo/bind', { cargoId, plate }),
  unbind: (cargoId: string) => apiClient.post<void, { cargoId: string }>('/cargo/unbind', { cargoId }),
  updateStatus: (cargoId: string, payload: UpdateCargoStatusRequest) => apiClient.put<CargoDto, UpdateCargoStatusRequest>(`/cargo/${encode(cargoId)}/status`, payload),
  statusLogs: (cargoId: string) => apiClient.get<CargoStatusLog[]>(`/cargo/${encode(cargoId)}/status-logs`),
  position: (cargoId: string) => apiClient.get<CargoPosition>(`/cargo/${encode(cargoId)}/position`),
  trajectory: (cargoId: string, params: TrajectoryQuery = {}) => apiClient.get<CargoTrajectory>(`/cargo/${encode(cargoId)}/trajectory`, { params }),
  eta: (cargoId: string) => apiClient.get<CargoEta>(`/cargo/${encode(cargoId)}/eta`),
  timeline: (cargoId: string) => apiClient.get<CargoTimeline>(`/cargo/${encode(cargoId)}/timeline`),
}

export const alertApi = {
  list: (params: AlertListQuery = {}) => apiClient.get<PageResult<AlertDto>>('/alerts', { params }),
  detail: (alertId: string) => apiClient.get<AlertDto>(`/alerts/${encode(alertId)}`),
  acknowledge: (alertId: string, remark: string) => apiClient.post<AlertDto, { remark: string }>(`/alerts/${encode(alertId)}/acknowledge`, { remark }),
  resolve: (alertId: string, resolution: string, remark: string) => apiClient.post<AlertDto, { resolution: string; remark: string }>(`/alerts/${encode(alertId)}/resolve`, { resolution, remark }),
  stats: (params: { startTime?: string; endTime?: string } = {}) => apiClient.get<AlertStats>('/alerts/stats', { params }),
}

export const deviceApi = {
  status: (params: PageQuery & { status?: 'ONLINE' | 'OFFLINE'; keyword?: string } = {}) => apiClient.get<DeviceStatusResult>('/devices/status', { params }),
  detail: (imei: string) => apiClient.get<DeviceDto>(`/devices/${encode(imei)}`),
  heartbeats: (imei: string, params: { startTime?: string; endTime?: string } = {}) => apiClient.get<DeviceHeartbeat[]>(`/devices/${encode(imei)}/heartbeats`, { params }),
  cargoEvents: (imei: string, params: PageQuery = {}) => apiClient.get<PageResult<CargoDeviceEvent>>(`/devices/${encode(imei)}/cargo-events`, { params }),
}

export const assistantApi = {
  chat: (payload: AssistantChatRequest) => apiClient.post<AssistantChatResponse, AssistantChatRequest>('/assistant/chat', payload),
  suggestions: (cargoId?: string) => apiClient.get<string[]>('/assistant/suggestions', { params: cargoId ? { cargoId } : undefined }),
  messages: (sessionId: string) => apiClient.get<AssistantMessage[]>(`/assistant/sessions/${encode(sessionId)}/messages`),
}

export const knowledgeApi = {
  upload(file: File, title: string, category: string) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('category', category)
    return apiClient.upload<KnowledgeDocument>('/knowledge/documents', formData)
  },
  index: (documentId: string) => apiClient.post<KnowledgeIndexResult>(`/knowledge/documents/${encode(documentId)}/index`),
  list: (params: PageQuery = {}) => apiClient.get<PageResult<KnowledgeDocument>>('/knowledge/documents', { params }),
  remove: (documentId: string) => apiClient.delete<void>(`/knowledge/documents/${encode(documentId)}`),
}

export const systemApi = {
  health: () => apiClient.get<HealthStatus>('/health', { skipAuth: true }),
  components: () => apiClient.get<HealthStatus>('/health/components'),
}
