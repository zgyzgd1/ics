import { openDB, type IDBPDatabase, type DBSchema } from 'idb'

const DB_NAME = 'doc2ics'
const DB_VERSION = 1
const STORE_NAME = 'mappings'

export interface MappingTemplate {
  id: string
  name: string
  summaryPrefix?: string
  timezone?: string
}

interface Doc2IcsDB extends DBSchema {
  mappings: {
    key: string
    value: MappingTemplate
  }
}

let dbPromise: Promise<IDBPDatabase<Doc2IcsDB>> | null = null

function getDb() {
  if (!dbPromise) {
    try {
      dbPromise = openDB<Doc2IcsDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          }
        },
      })
    } catch {
      dbPromise = Promise.reject(new Error('IndexedDB 不可用'))
    }
  }
  return dbPromise
}

export async function saveMappingTemplate(template: MappingTemplate): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, template)
}

export async function listMappingTemplates(): Promise<MappingTemplate[]> {
  try {
    const db = await getDb()
    return db.getAll(STORE_NAME)
  } catch {
    return []
  }
}
