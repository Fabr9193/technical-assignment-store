import { JSONArray, JSONObject, JSONPrimitive } from "./json-types";

export type Permission = "r" | "w" | "rw" | "none";

export type StoreResult = Store | JSONPrimitive | undefined;

export type StoreValue = 
  | JSONObject
  | JSONArray
  | StoreResult
  | (() => StoreResult);

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): StoreResult;
  write(path: string, value: StoreValue): StoreValue;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

export class Store implements IStore {
  private store: Record<string, any> = {};
  public defaultPolicy: Permission = "rw";

  // Check if the key has read permissions
  allowedToRead(key: string): boolean {
    const allowedtoReadPermissions: Permission[] = ["rw", "r"];
    return allowedtoReadPermissions.includes(this.defaultPolicy);
  }

  // Check if the key has write permissions
  allowedToWrite(key: string): boolean {
    const allowedtoWritePermissions: Permission[] = ["rw", "w"];
    return allowedtoWritePermissions.includes(this.defaultPolicy);
  }

  // Read a value based on a given path
  read(path: string): StoreResult {
    const keys = path.split('.');
    let current: any = this.store;

    for (const key of keys) {
      if (!this.allowedToRead(key)) {
        throw new Error(`Permission denied to read key: ${key}`);
      }

      if (current[key] === undefined) {
        return undefined;
      }

      current = current[key];
    }

    return current;
  }

  // Write a value to the store based on a given path
  write(path: string, value: StoreValue): StoreValue {
    const keys = path.split('.');
    let current: any = this.store;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!this.allowedToWrite(key)) {
        throw new Error(`Permission denied to write on key: ${key}`);
      }

      if (!current[key]) {
        current[key] = {};
      }

      current = current[key];
    }

    const lastKey = keys[keys.length - 1];
    if (!this.allowedToWrite(lastKey)) {
      throw new Error(`Permission denied to write on key: ${lastKey}`);
    }

    current[lastKey] = value;
    return value;
  }

  // Write multiple entries into the store
  writeEntries(entries: JSONObject): void {
    for (const key in entries) {
      if (Object.prototype.hasOwnProperty.call(entries, key)) {
        this.write(key, entries[key]);
      }
    }
  }

  // Return all entries in the store
  entries(): JSONObject {
    return { ...this.store };
  }
}

export function Restrict(permission: Permission) {
  return function (target: any, propertyKey: string | symbol): void {
    if (!target.constructor.permissions) {
      target.constructor.permissions = {};
    }

    target.constructor.permissions[propertyKey] = permission;
  };
}
