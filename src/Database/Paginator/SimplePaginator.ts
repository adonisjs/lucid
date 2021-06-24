/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { stringify } from 'qs'
import { SimplePaginatorContract, SimplePaginatorMetaKeys } from '@ioc:Adonis/Lucid/Database'

import { SnakeCaseNamingStrategy } from '../../Orm/NamingStrategies/SnakeCase'

/**
 * Simple paginator works with the data set provided by the standard
 * `offset` and `limit` based pagination.
 */
export class SimplePaginator extends Array implements SimplePaginatorContract<any> {
  private qs: { [key: string]: any } = {}
  private url: string = '/'

  /**
   * Naming strategy for the pagination meta keys
   */
  public static namingStrategy: {
    paginationMetaKeys(): SimplePaginatorMetaKeys
  } = new SnakeCaseNamingStrategy()

  /**
   * Can be defined at per instance level as well
   */
  public namingStrategy = SimplePaginator.namingStrategy

  /**
   * The first page is always 1
   */
  public readonly firstPage: number = 1

  /**
   * Find if results set is empty or not
   */
  public readonly isEmpty: boolean = this.rows.length === 0

  /**
   * Casting `total` to a number. Later, we can think of situations
   * to cast it to a bigint
   */
  public readonly total = Number(this.totalNumber)

  /**
   * Find if there are total records or not. This is not same as
   * `isEmpty`.
   *
   * The `isEmpty` reports about the current set of results. However `hasTotal`
   * reports about the total number of records, regardless of the current.
   */
  public readonly hasTotal: boolean = this.total > 0

  /**
   * The Last page number
   */
  public readonly lastPage: number = Math.max(Math.ceil(this.total / this.perPage), 1)

  /**
   * Find if there are more pages to come
   */
  public readonly hasMorePages: boolean = this.lastPage > this.currentPage

  /**
   * Find if there are enough results to be paginated or not
   */
  public readonly hasPages: boolean = this.currentPage !== 1 || this.hasMorePages

  constructor(
    private rows: any[],
    private totalNumber: number,
    public readonly perPage: number,
    public readonly currentPage: number
  ) {
    super(...rows)
  }

  /**
   * A reference to the result rows
   */
  public all() {
    return this.rows
  }

  /**
   * Returns JSON meta data
   */
  public getMeta(): any {
    const metaKeys = this.namingStrategy.paginationMetaKeys()

    return {
      [metaKeys.total]: this.total,
      [metaKeys.perPage]: this.perPage,
      [metaKeys.currentPage]: this.currentPage,
      [metaKeys.lastPage]: this.lastPage,
      [metaKeys.firstPage]: this.firstPage,
      [metaKeys.nextPage]: this.getNextPage(),
      [metaKeys.previousPage]: this.getPreviousPage(),
      [metaKeys.firstPageUrl]: this.getUrl(1),
      [metaKeys.lastPageUrl]: this.getUrl(this.lastPage),
      [metaKeys.nextPageUrl]: this.getUrl(this.getNextPage()),
      [metaKeys.previousPageUrl]: this.getUrl(this.getPreviousPage()),
    }
  }

  /**
   * Returns JSON representation of the paginated
   * data
   */
  public toJSON() {
    return {
      meta: this.getMeta(),
      data: this.all(),
    }
  }

  /**
   * Define query string to be appended to the pagination links
   */
  public queryString(values: { [key: string]: any }): this {
    this.qs = values
    return this
  }

  /**
   * Define base url for making the pagination links
   */
  public baseUrl(url: string): this {
    this.url = url
    return this
  }

  /**
   * Returns url for a given page.
   */
  public getUrl(page: number | null): string | null {
    if (page === null) return null

    const qs = stringify(Object.assign({}, this.qs, { page: page < 1 ? 1 : page }))
    return `${this.url}?${qs}`
  }

  /**
   * Returns value for the next page
   */
  public getNextPage(): number | null {
    if (this.hasMorePages) {
      return this.currentPage + 1
    }
    return null
  }

  /**
   * Returns value for the previous page
   */
  public getPreviousPage(): number | null {
    if (this.currentPage > 1) {
      return this.currentPage - 1
    }

    return null
  }

  /**
   * Returns an array of urls under a given range
   */
  public getUrlsForRange(start: number, end: number) {
    let urls: { url: string; page: number; isActive: boolean }[] = []
    for (let i = start; i <= end; i++) {
      urls.push({ url: this.getUrl(i)!, page: i, isActive: i === this.currentPage })
    }

    return urls
  }
}
