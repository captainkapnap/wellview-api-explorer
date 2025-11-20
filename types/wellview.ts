export interface UserContext {
  username: string
  organizations: Organization[]
}

export interface Organization {
  name: string
  applications: Application[]
}

export interface Application {
  name: string
  header: string
  version?: number
  appprofiles: any[]
}

export interface EndpointConfig {
  id: string
  name: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD"
  path: string
  description: string
  disabled?: boolean
  params?: {
    path?: PathParam[]
    query?: QueryParam[]
  }
}

export interface PathParam {
  name: string
  type: "text" | "dropdown" | "uuid"
  label: string
  required: boolean
  source?: "tables" | "entityIds"
  placeholder?: string
}

export interface QueryParam {
  name: string
  type: "text" | "number" | "date"
  label: string
  placeholder?: string
  defaultValue?: string
}

export interface ApiResponse {
  status: number
  statusText: string
  data: any
  responseTime: number
}
