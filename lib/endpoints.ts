import type { EndpointConfig } from "@/types/wellview"

export const endpoints: EndpointConfig[] = [
  // User
  {
    id: "get-user",
    name: "Get User",
    method: "GET",
    path: "/user",
    description: "Gets the user's list of organizations and applications",
  },

  // Library
  {
    id: "get-library-tables",
    name: "Get Library Tables",
    method: "GET",
    path: "/{activeOU}/{appName}/library/tables",
    description: "Gets a list of all library table names",
  },
  {
    id: "get-library-table",
    name: "Get Library Table",
    method: "GET",
    path: "/{activeOU}/{appName}/library/table/{tableName}",
    description: "Gets the library table data with columns and tabs",
    params: {
      path: [
        {
          name: "tableName",
          type: "dropdown",
          label: "Table Name",
          required: true,
          source: "tables",
        },
      ],
    },
  },
  {
    id: "set-library-table",
    name: "Set Library Table",
    method: "POST",
    path: "/{activeOU}/{appName}/library/table/{tableName}",
    description: "Sets the library table data",
    disabled: true,
  },

  // Attachment
  {
    id: "get-records-with-attachments",
    name: "Get Records with Attachments",
    method: "GET",
    path: "/{activeOU}/{appName}/attachments/entityId/{entityId}/recordIds",
    description: "For an entity, gets list of record IDs that have attachments",
    params: {
      path: [
        {
          name: "entityId",
          type: "text",
          label: "Entity ID",
          required: true,
          placeholder: "e.g., IDWell, IDFlowNetwork",
        },
      ],
    },
  },
  {
    id: "get-attachment-for-record",
    name: "Get Attachment for Record",
    method: "GET",
    path: "/{activeOU}/{appName}/attachments/{tableName}/entityId/{entityId}/recordId/{recordId}",
    description: "Gets attachment for a record as octet-stream",
    params: {
      path: [
        {
          name: "tableName",
          type: "dropdown",
          label: "Table Name",
          required: true,
          source: "tables",
        },
        {
          name: "entityId",
          type: "text",
          label: "Entity ID",
          required: true,
          placeholder: "e.g., IDWell",
        },
        {
          name: "recordId",
          type: "uuid",
          label: "Record ID",
          required: true,
          placeholder: "e.g., 12345678-1234-1234-1234-123456789abc",
        },
      ],
    },
  },
  {
    id: "head-attachment-exists",
    name: "Attachment Exists",
    method: "HEAD",
    path: "/{activeOU}/{appName}/attachments/{tableName}/entityId/{entityId}/recordId/{recordId}",
    description: "Checks if a record has an attachment",
    params: {
      path: [
        {
          name: "tableName",
          type: "dropdown",
          label: "Table Name",
          required: true,
          source: "tables",
        },
        {
          name: "entityId",
          type: "text",
          label: "Entity ID",
          required: true,
          placeholder: "e.g., IDWell",
        },
        {
          name: "recordId",
          type: "uuid",
          label: "Record ID",
          required: true,
          placeholder: "e.g., 12345678-1234-1234-1234-123456789abc",
        },
      ],
    },
  },
  {
    id: "post-attachment",
    name: "Update/Insert Attachment",
    method: "POST",
    path: "/{activeOU}/{appName}/attachments/{tableName}/entityId/{entityId}/recordId/{recordId}/{filename}",
    description: "Adds or replaces an attachment for a record",
    disabled: true,
  },
  {
    id: "delete-attachment",
    name: "Delete Attachment",
    method: "DELETE",
    path: "/{activeOU}/{appName}/attachments/{tableName}/entityId/{entityId}/recordId/{recordId}",
    description: "Deletes the attachment for a record",
    disabled: true,
  },

  // Data
  {
    id: "get-data",
    name: "Get Data",
    method: "GET",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}",
    description: "Gets all data for table or filtered records",
    params: {
      path: [
        {
          name: "tableName",
          type: "dropdown",
          label: "Table Name",
          required: true,
          source: "tables",
        },
      ],
      query: [
        { name: "fields", type: "text", label: "Fields", placeholder: "Comma-separated: field1,field2" },
        { name: "startDate", type: "date", label: "Start Date (ISO 8601)" },
        { name: "endDate", type: "date", label: "End Date (ISO 8601)" },
        { name: "sysModDate", type: "date", label: "Modified Since Date" },
        { name: "pageSize", type: "number", label: "Page Size", placeholder: "100", defaultValue: "100" },
        { name: "cursor", type: "text", label: "Cursor (from previous response)" },
      ],
    },
  },
  {
    id: "get-data-for-entity",
    name: "Get Data For Entity",
    method: "GET",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}/entityId/{entityId}",
    description: "Gets data for specific entity (well, flow network, etc.)",
    params: {
      path: [
        {
          name: "tableName",
          type: "dropdown",
          label: "Table Name",
          required: true,
          source: "tables",
        },
        {
          name: "entityId",
          type: "text",
          label: "Entity ID",
          required: true,
          placeholder: "e.g., IDWell, IDFlowNetwork",
        },
      ],
      query: [
        { name: "fields", type: "text", label: "Fields", placeholder: "Comma-separated: field1,field2" },
        { name: "startDate", type: "date", label: "Start Date (ISO 8601)" },
        { name: "endDate", type: "date", label: "End Date (ISO 8601)" },
        { name: "sysModDate", type: "date", label: "Modified Since Date" },
        { name: "pageSize", type: "number", label: "Page Size", placeholder: "100", defaultValue: "100" },
        { name: "cursor", type: "text", label: "Cursor (from previous response)" },
      ],
    },
  },
  {
    id: "get-data-for-parent",
    name: "Get Data For Parent",
    method: "GET",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}/parentId/{parentId}",
    description: "Gets data for specific parent record",
    params: {
      path: [
        {
          name: "tableName",
          type: "dropdown",
          label: "Table Name",
          required: true,
          source: "tables",
        },
        {
          name: "parentId",
          type: "uuid",
          label: "Parent Record ID",
          required: true,
          placeholder: "e.g., 12345678-1234-1234-1234-123456789abc",
        },
      ],
      query: [
        { name: "fields", type: "text", label: "Fields", placeholder: "Comma-separated: field1,field2" },
        { name: "startDate", type: "date", label: "Start Date (ISO 8601)" },
        { name: "endDate", type: "date", label: "End Date (ISO 8601)" },
        { name: "sysModDate", type: "date", label: "Modified Since Date" },
        { name: "pageSize", type: "number", label: "Page Size", placeholder: "100", defaultValue: "100" },
        { name: "cursor", type: "text", label: "Cursor (from previous response)" },
      ],
    },
  },
  {
    id: "get-data-for-field",
    name: "Get Data For Field",
    method: "GET",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}/entityId/{entityId}/recordId/{recordId}/{fieldName}",
    description: "Gets specific field value from a record",
    params: {
      path: [
        {
          name: "tableName",
          type: "dropdown",
          label: "Table Name",
          required: true,
          source: "tables",
        },
        {
          name: "entityId",
          type: "text",
          label: "Entity ID",
          required: true,
          placeholder: "e.g., IDWell",
        },
        {
          name: "recordId",
          type: "uuid",
          label: "Record ID",
          required: true,
          placeholder: "e.g., 12345678-1234-1234-1234-123456789abc",
        },
        {
          name: "fieldName",
          type: "text",
          label: "Field Name",
          required: true,
          placeholder: "e.g., FieldValue",
        },
      ],
    },
  },
  {
    id: "get-data-for-record",
    name: "Get Data For Record",
    method: "GET",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}/entityId/{entityId}/recordId/{recordId}",
    description: "Gets a specific record",
    params: {
      path: [
        {
          name: "tableName",
          type: "dropdown",
          label: "Table Name",
          required: true,
          source: "tables",
        },
        {
          name: "entityId",
          type: "text",
          label: "Entity ID",
          required: true,
          placeholder: "e.g., IDWell",
        },
        {
          name: "recordId",
          type: "uuid",
          label: "Record ID",
          required: true,
          placeholder: "e.g., 12345678-1234-1234-1234-123456789abc",
        },
      ],
    },
  },
  {
    id: "get-last-records-for-entity",
    name: "Get Last Records For Entity",
    method: "GET",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}/entityId/{entityId}/lastRecords",
    description: "Gets last record before date for each parent (DateAndCountFilterPlusOne only)",
    params: {
      path: [
        {
          name: "tableName",
          type: "dropdown",
          label: "Table Name",
          required: true,
          source: "tables",
        },
        {
          name: "entityId",
          type: "text",
          label: "Entity ID",
          required: true,
          placeholder: "e.g., IDWell",
        },
      ],
      query: [
        { name: "fields", type: "text", label: "Fields", placeholder: "Comma-separated: field1,field2" },
        { name: "beforeDate", type: "date", label: "Before Date (ISO 8601)" },
      ],
    },
  },
  {
    id: "get-batch-job-result",
    name: "Get Batch Job Result",
    method: "GET",
    path: "/{activeOU}/{appName}/{version}/data/batchjob/{batchjobid}",
    description: "Gets results for running or completed batch job",
    params: {
      path: [
        {
          name: "batchjobid",
          type: "uuid",
          label: "Batch Job ID",
          required: true,
          placeholder: "Batch job ID from job creation",
        },
      ],
    },
  },
  {
    id: "post-create-data",
    name: "Create Data",
    method: "POST",
    path: "/{activeOU}/{appName}/{version}/data",
    description: "Creates multiple records in multiple tables",
    disabled: true,
  },
  {
    id: "post-create-data-for-table",
    name: "Create Data For Table",
    method: "POST",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}",
    description: "Creates data in the table provided",
    disabled: true,
  },
  {
    id: "post-batch-job",
    name: "Batch Job For Table",
    method: "POST",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}/batchjob",
    description: "Starts a batch job to return data related to a table",
    disabled: true,
  },
  {
    id: "put-update-data",
    name: "Update Data",
    method: "PUT",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}",
    description: "Updates a record in the table provided",
    disabled: true,
  },
  {
    id: "put-update-data-for-field",
    name: "Update Data For Field",
    method: "PUT",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}/entityId/{entityId}/recordId/{recordId}/{fieldName}",
    description: "Sets a specific field value on a single record",
    disabled: true,
  },
  {
    id: "put-update-all-data-for-field",
    name: "Update All Data For Field",
    method: "PUT",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}/{fieldName}",
    description: "Sets a specific field value on records matching filter",
    disabled: true,
  },
  {
    id: "delete-data",
    name: "Delete Data",
    method: "DELETE",
    path: "/{activeOU}/{appName}/{version}/data/{tableName}/entityid/{entityId}/recordid/{recordId}",
    description: "Deletes a record",
    disabled: true,
  },
]

export const endpointCategories = [
  {
    name: "User",
    endpoints: endpoints.filter((e) => e.path.startsWith("/user")),
  },
  {
    name: "Library",
    endpoints: endpoints.filter((e) => e.path.includes("/library")),
  },
  {
    name: "Attachment",
    endpoints: endpoints.filter((e) => e.path.includes("/attachments")),
  },
  {
    name: "Data",
    endpoints: endpoints.filter((e) => e.path.includes("/data") && !e.path.includes("batchjob")),
  },
]
