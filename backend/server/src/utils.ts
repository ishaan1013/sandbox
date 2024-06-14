export class LockManager {
  private locks: { [key: string]: Promise<any> };

  constructor() {
    this.locks = {};
  }

  async acquireLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    if (!this.locks[key]) {
      this.locks[key] = new Promise<T>(async (resolve, reject) => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          delete this.locks[key];
        }
      });
    }
    return await this.locks[key];
  }
}