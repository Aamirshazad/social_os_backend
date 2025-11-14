/**
 * BASE REPOSITORY PATTERN
 * Provides a consistent interface for database operations
 * Enables easy mocking and testing
 */

export interface FindOptions {
  select?: string[]
  where?: Record<string, any>
  orderBy?: { field: string; direction: 'asc' | 'desc' }[]
  limit?: number
  offset?: number
}

export interface PaginationOptions {
  limit: number
  offset: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface CursorPaginatedResult<T> {
  data: T[]
  nextCursor?: string
  prevCursor?: string
  hasMore: boolean
}

/**
 * Base Repository abstract class
 * All repository implementations should extend this
 */
export abstract class Repository<T, CreateDTO, UpdateDTO> {
  protected abstract tableName: string

  /**
   * Find all records
   */
  abstract findAll(options?: FindOptions): Promise<T[]>

  /**
   * Find a single record by ID
   */
  abstract findById(id: string): Promise<T | null>

  /**
   * Find records by custom criteria
   */
  abstract find(where: Record<string, any>, options?: FindOptions): Promise<T[]>

  /**
   * Find first record matching criteria
   */
  abstract findFirst(where: Record<string, any>): Promise<T | null>

  /**
   * Count records matching criteria
   */
  abstract count(where?: Record<string, any>): Promise<number>

  /**
   * Create a new record
   */
  abstract create(data: CreateDTO): Promise<T>

  /**
   * Update a record by ID
   */
  abstract update(id: string, data: UpdateDTO): Promise<T | null>

  /**
   * Delete a record by ID
   */
  abstract delete(id: string): Promise<boolean>

  /**
   * Delete multiple records
   */
  abstract deleteMany(where: Record<string, any>): Promise<number>

  /**
   * Check if a record exists
   */
  abstract exists(where: Record<string, any>): Promise<boolean>

  /**
   * Get paginated results
   */
  abstract paginate(
    where: Record<string, any>,
    options: PaginationOptions
  ): Promise<PaginatedResult<T>>

  /**
   * Get cursor-paginated results
   */
  abstract cursorPaginate(
    where: Record<string, any>,
    options: { limit: number; cursor?: string }
  ): Promise<CursorPaginatedResult<T>>

  /**
   * Upsert - update if exists, create if not
   */
  abstract upsert(
    where: Record<string, any>,
    createData: CreateDTO,
    updateData: UpdateDTO
  ): Promise<T>
}

/**
 * Utility to build WHERE clauses
 */
export class QueryBuilder {
  private conditions: Record<string, any> = {}

  where(field: string, value: any): this {
    this.conditions[field] = value
    return this
  }

  whereIn(field: string, values: any[]): this {
    this.conditions[`${field}:in`] = values
    return this
  }

  whereNot(field: string, value: any): this {
    this.conditions[`${field}:not`] = value
    return this
  }

  whereBetween(field: string, min: any, max: any): this {
    this.conditions[`${field}:between`] = { min, max }
    return this
  }

  build(): Record<string, any> {
    return this.conditions
  }
}

/**
 * Pagination helper
 */
export class Pagination {
  readonly page: number
  readonly pageSize: number
  readonly offset: number

  constructor(page: number = 1, pageSize: number = 20) {
    this.page = Math.max(1, page)
    this.pageSize = Math.min(Math.max(1, pageSize), 100) // Limit max page size to 100
    this.offset = (this.page - 1) * this.pageSize
  }

  static fromCursor(cursor?: string, limit: number = 20) {
    const decodedCursor = cursor ? Buffer.from(cursor, 'base64').toString() : undefined
    return new CursorPagination(decodedCursor, Math.min(Math.max(1, limit), 100))
  }

  getSkipTake() {
    return {
      skip: this.offset,
      take: this.pageSize
    }
  }
}

/**
 * Cursor-based pagination helper
 */
export class CursorPagination {
  readonly cursor?: string
  readonly limit: number

  constructor(cursor?: string, limit: number = 20) {
    this.cursor = cursor
    this.limit = Math.min(Math.max(1, limit), 100)
  }

  encodeCursor(value: string): string {
    return Buffer.from(value).toString('base64')
  }

  decodeCursor(encoded: string): string {
    return Buffer.from(encoded, 'base64').toString()
  }
}

/**
 * Result wrapper for consistent response format
 */
export class RepositoryResult<T> {
  constructor(
    public success: boolean,
    public data?: T,
    public error?: string
  ) {}

  static ok<T>(data: T): RepositoryResult<T> {
    return new RepositoryResult(true, data)
  }

  static err<T>(error: string): RepositoryResult<T> {
    return new RepositoryResult(false, undefined as any, error)
  }
}
