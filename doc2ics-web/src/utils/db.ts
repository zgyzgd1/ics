import { openDB } from 'idb'

const DB_NAME = 'doc2ics'
const DB_VERSION = 1
const STORE_NAME = 'mappings'

export interface MappingTemplate {
  id: string
  name: string
  summaryPrefix?: string
  timezone?: string
}

const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
  },
})

export async function saveMappingTemplate(template: MappingTemplate): Promise<void> {
  const db = await dbPromise
  await db.put(STORE_NAME, template)
}

export async function listMappingTemplates(): Promise<MappingTemplate[]> {
  const db = await dbPromise
  return db.getAll(STORE_NAME)
}
