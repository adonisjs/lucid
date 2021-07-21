/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { DateTime } from 'luxon'
import { Exception } from '@poppinss/utils'
import { LoggerContract } from '@ioc:Adonis/Core/Logger'
import { DatabaseContract, DatabaseQueryBuilderContract } from '@ioc:Adonis/Lucid/Database'
import {
  DbRowCheckOptions,
  ValidationRuntimeOptions,
  validator as validatorStatic,
} from '@ioc:Adonis/Core/Validator'

/**
 * Shape of constraint after normalization
 */
type NormalizedConstraint = {
  key: string
  operator: 'in' | 'eq'
  value?: string | string[]
  ref?: string
}

/**
 * Normalized validation options
 */
type NormalizedOptions = Omit<DbRowCheckOptions, 'constraints' | 'where' | 'whereNot'> & {
  where: NormalizedConstraint[]
  whereNot: NormalizedConstraint[]
}

/**
 * Checks for database rows for `exists` and `unique` rule.
 */
class DbRowCheck {
  constructor(
    private ruleName: 'exists' | 'unique',
    private database: DatabaseContract,
    private helpers: typeof validatorStatic['helpers']
  ) {}

  /**
   * Applies user defined where constraints on the query builder
   */
  private applyWhere(
    query: DatabaseQueryBuilderContract,
    constraints: NormalizedConstraint[],
    refs: ValidationRuntimeOptions['refs']
  ) {
    if (!constraints.length) {
      return
    }

    constraints.forEach(({ key, operator, value, ref }) => {
      const val = ref ? refs[ref].value : value

      if (operator === 'in') {
        query.whereIn(key, val as string[])
      } else {
        query.where(key, val as string)
      }
    })
  }

  /**
   * Applies user defined where not constraints on the query builder
   */
  private applyWhereNot(
    query: DatabaseQueryBuilderContract,
    constraints: NormalizedConstraint[],
    refs: ValidationRuntimeOptions['refs']
  ) {
    if (!constraints.length) {
      return
    }

    constraints.forEach(({ key, operator, value, ref }) => {
      const val = ref ? refs[ref].value : value

      if (operator === 'in') {
        query.whereNotIn(key, val as string[])
      } else {
        query.whereNot(key, val as string)
      }
    })
  }

  /**
   * Normalizes constraints
   */
  private normalizeConstraints(constraints: DbRowCheckOptions['where']) {
    const normalized: NormalizedConstraint[] = []
    if (!constraints) {
      return normalized
    }

    /**
     * Normalize object into an array of objects
     */
    return Object.keys(constraints).reduce((result, key) => {
      const value = constraints[key]

      if (this.helpers.isRef(value)) {
        result.push({ key, ref: value.key, operator: Array.isArray(value.value) ? 'in' : 'eq' })
      } else {
        result.push({ key, value, operator: Array.isArray(value) ? 'in' : 'eq' })
      }

      return result
    }, normalized)
  }

  /**
   * Compile validation options
   */
  public compile(options: DbRowCheckOptions) {
    /**
     * Ensure options are defined with table and column name
     */
    if (!options || !options.table || !options.column) {
      throw new Exception(`"${this.ruleName}" rule expects a "table" and a "column" name`)
    }

    /**
     * Emit warning
     */
    if (options.constraints) {
      process.emitWarning(
        'DeprecationWarning',
        '"options.constraints" have been depreciated. Use "options.where" instead.'
      )
    }

    return {
      table: options.table,
      column: options.column,
      caseInsensitive: !!options.caseInsensitive,
      connection: options.connection,
      dateFormat: options.dateFormat,
      where: this.normalizeConstraints(options.where || options.constraints),
      whereNot: this.normalizeConstraints(options.whereNot),
    }
  }

  /**
   * Validate value
   */
  public async validate(
    value: any,
    { table, column, where, whereNot, connection, caseInsensitive, dateFormat }: NormalizedOptions,
    { pointer, errorReporter, arrayExpressionPointer, refs }: ValidationRuntimeOptions
  ) {
    const client = this.database.connection(connection)
    const query = client.from(table).select(1)

    /**
     * Convert datetime to a string
     */
    if (DateTime.isDateTime(value)) {
      const format = dateFormat || client.dialect.dateTimeFormat
      value = value.toFormat(format)
    }

    /**
     * https://www.sqlite.org/lang_corefunc.html#lower
     * https://docs.aws.amazon.com/redshift/latest/dg/r_LOWER.html
     * https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_lower
     * https://www.postgresql.org/docs/9.1/functions-string.html
     * https://docs.microsoft.com/en-us/sql/t-sql/functions/lower-transact-sql?view=sql-server-ver15
     * https://coderwall.com/p/6yhsuq/improve-case-insensitive-queries-in-postgres-using-smarter-indexes
     */
    if (caseInsensitive) {
      query.whereRaw(`lower(${column}) = ?`, [this.database.raw(`lower(?)`, [value])])
    } else {
      query.where(column, value)
    }

    this.applyWhere(query, where, refs)
    this.applyWhereNot(query, whereNot, refs)

    const row = await query.first()
    if (this.ruleName === 'exists') {
      if (!row) {
        errorReporter.report(
          pointer,
          this.ruleName,
          `${this.ruleName} validation failure`,
          arrayExpressionPointer
        )
      }
      return
    }

    if (this.ruleName === 'unique') {
      if (row) {
        errorReporter.report(
          pointer,
          this.ruleName,
          `${this.ruleName} validation failure`,
          arrayExpressionPointer
        )
      }
      return
    }
  }
}

/**
 * Extends the validator by adding `unique` and `exists`
 */
export function extendValidator(
  validator: typeof validatorStatic,
  database: DatabaseContract,
  logger: LoggerContract
) {
  /**
   * Exists rule to ensure the value exists in the database
   */
  const existsChecker = new DbRowCheck('exists', database, validator.helpers)

  validator.rule<ReturnType<typeof existsChecker['compile']>>(
    'exists',
    async (value, compiledOptions, options) => {
      try {
        await existsChecker.validate(value, compiledOptions, options)
      } catch (error) {
        logger.fatal({ err: error }, '"exists" validation rule failed')
        options.errorReporter.report(
          options.pointer,
          'exists',
          'exists validation failure',
          options.arrayExpressionPointer
        )
      }
    },
    (options) => {
      return {
        compiledOptions: existsChecker.compile(options[0]),
        async: true,
      }
    }
  )

  /**
   * Unique rule to check if value is unique or not
   */
  const uniqueChecker = new DbRowCheck('unique', database, validator.helpers)

  validator.rule<ReturnType<typeof existsChecker['compile']>>(
    'unique',
    async (value, compiledOptions, options) => {
      try {
        await uniqueChecker.validate(value, compiledOptions, options)
      } catch (error) {
        logger.fatal({ err: error }, '"unique" validation rule failed')
        options.errorReporter.report(
          options.pointer,
          'unique',
          'unique validation failure',
          options.arrayExpressionPointer
        )
      }
    },
    (options) => {
      return {
        compiledOptions: uniqueChecker.compile(options[0]),
        async: true,
      }
    }
  )
}
