const DB_NAME = 'draftStorage';
const STORE_NAME = 'drafts';

// Define draft record structure
interface DraftRecord {
  id: string;
  position: string;
  file: File | any; // Can be File or plain object
  expiresAt: string;
  createdAt: string;
}

export class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    // Only initialize indexedDB in browser environment
    if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2);
        
        request.onupgradeneeded = (event) => {
          const db = request.result;
          const transaction = request.transaction;
          
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            // Create store and index for new databases
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('position', 'position', { unique: false });
          } else if (transaction) {
            // Add index to existing databases
            const store = transaction.objectStore(STORE_NAME);
            if (!store.indexNames.contains('position')) {
              store.createIndex('position', 'position', { unique: false });
            }
          }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } else {
      // In server environment or when indexedDB is not available, set to null
      this.dbPromise = null;
    }
  }

  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.dbPromise) {
      return null;
    }
    
    try {
      return await this.dbPromise;
    } catch (error) {
      console.warn('Failed to initialize indexedDB:', error);
      return null;
    }
  }

  async storeDraft(position: string, file: File, expiresAt: Date): Promise<void> {
    // Use position + timestamp as the ID to match app/page.tsx usage
    const id = `${position}-${Date.now()}`;
    
    // Ensure we're storing a proper File object
    const fileToStore = file instanceof File ? file : new File(
      [file], 
      (file as File).name || 'upload.jpg', 
      { type: (file as File).type || 'image/jpeg' }
    );
    
    const db = await this.getDB();
    if (!db) {
      // Skip storage if indexedDB is not available
      return;
    }
    
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      store.put({ 
        id,
        position,
        file: fileToStore, 
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getDraft(positionOrId: string, isPosition = false): Promise<File | null> {
    const db = await this.getDB();
    if (!db) {
      // Return null if indexedDB is not available
      return null;
    }
    
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      let request: IDBRequest;
      
      if (isPosition) {
        try {
          // Try to use the index
          const index = store.index('position');
          const indexRequest = index.getAll(positionOrId);
          indexRequest.onsuccess = () => {
            const drafts: DraftRecord[] = indexRequest.result || [];
            // Find the most recent non-expired draft
            const validDraft = drafts
              .filter(d => new Date(d.expiresAt) > new Date())
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            
            if (validDraft) {
              resolve(validDraft.file instanceof File ? validDraft.file : 
                new File([validDraft.file], 'upload.jpg', { type: validDraft.file.type || 'image/jpeg' }));
            } else {
              resolve(null);
            }
          };
          indexRequest.onerror = () => resolve(null);
        } catch (error) {
          console.error('Error using position index, falling back to cursor', error);
          // Fallback: iterate with cursor
          const cursorRequest = store.openCursor();
          const drafts: DraftRecord[] = [];
          cursorRequest.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const value = cursor.value as DraftRecord;
              if (value.position === positionOrId) {
                drafts.push(value);
              }
              cursor.continue();
            } else {
              // Cursor done, now process the drafts
              const validDraft = drafts
                .filter(d => new Date(d.expiresAt) > new Date())
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              
              if (validDraft) {
                resolve(validDraft.file instanceof File ? validDraft.file : 
                  new File([validDraft.file], 'upload.jpg', { type: validDraft.file.type || 'image/jpeg' }));
              } else {
                resolve(null);
              }
            }
          };
          cursorRequest.onerror = () => resolve(null);
        }
      } else {
        // Standard ID-based lookup
        request = store.get(positionOrId);
        request.onsuccess = () => {
          const draft = request.result;
          if (draft && new Date(draft.expiresAt) > new Date()) {
            resolve(draft.file instanceof File ? draft.file : 
              new File([draft.file], 'upload.jpg', { type: draft.file.type || 'image/jpeg' }));
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      }
    });
  }

  async deleteDraft(id: string): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      // Skip deletion if indexedDB is not available
      return;
    }
    
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
  }

  async deleteExpiredDrafts(): Promise<void> {
    const db = await this.getDB();
    if (!db) {
      // Skip deletion if indexedDB is not available
      return;
    }
    
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const now = new Date();
        const drafts = request.result || [];
        
        drafts.forEach(draft => {
          if (new Date(draft.expiresAt) <= now) {
            store.delete(draft.id);
          }
        });
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  async hasDraft(id: string): Promise<boolean> {
    const db = await this.getDB();
    if (!db) {
      // Return false if indexedDB is not available
      return false;
    }
    
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const draft = request.result;
        resolve(draft && new Date(draft.expiresAt) > new Date());
      };
      request.onerror = () => resolve(false);
    });
  }
}
