/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import { Exception } from '@poppinss/utils'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import { DatabaseQueryBuilderContract } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { validator as validatorStatic, ValidationRuntimeOptions } from '@ioc:Adonis/Core/Validator'

/**
 * Checks for database rows for `exists` and `unique` rule.
 */
class DbRowCheck {
  constructor (private ruleName: 'exists' | 'unique', private database: DatabaseContract) {
  }

  /**
   * Applies user defined constraints on the query builder
   */
  private applyConstraints (query: DatabaseQueryBuilderContract, constraints: any[]) {
    if (constraints.length > 1) {
      query.where((builder) => {
        constraints.forEach((constraint) => builder.orWhere(constraint))
      })
    } else {
      constraints.forEach((constraint) => query.where(constraint))
    }
  }

  /**
   * Compile validation options
   */
  public compile (options) {
    /**
     * Ensure options are defined with table and column name
     */
    if (!options || !options.table || !options.column) {
      throw new Exception(`"${this.ruleName}" rule expects a "table" and a "column" name`)
    }

    /**
     * Normalize where constraints
     */
    let constraints: { [key: string]: any }[] = []
    if (options.constraints && Array.isArray(options.constraints)) {
      constraints = options.constraints
    } else if (options.constraints && typeof (options.constraints) === 'object' && options.constraints !== null) {
      constraints = [options.constraints]
    }

    return {
      table: options.table,
      column: options.column,
      connection: options.connection,
      constraints: constraints,
    }
  }

  /**
   * Validate value
   */
  public async validate (
    value: any,
    { table, column, constraints, connection }: any,
    { pointer, errorReporter, arrayExpressionPointer }: ValidationRuntimeOptions,
  ) {
    const query = this.database.connection(connection).query().from(table).where(column, value)
    this.applyConstraints(query, constraints)

    const row = await query.first()
    if (this.ruleName === 'exists') {
      if (!row) {
        errorReporter.report(pointer, this.ruleName, `${this.ruleName} validation failure`, arrayExpressionPointer)
      }
      return
    }

    if (this.ruleName === 'unique') {
      if (row) {
        errorReporter.report(pointer, this.ruleName, `${this.ruleName} validation failure`, arrayExpressionPointer)
      }
      return
    }
  }
}

/**
 * Extends the validator by adding `unique` and `exists`
 */
export function extendValidator (
  validator: typeof validatorStatic,
  database: DatabaseContract,
) {
  /**
   * Exists rule to ensure the value exists in the database
   */
  const existsChecker = new DbRowCheck('exists', database)
  validator.addRule('exists', {
    compile (_, __, args) {
      const compiledOptions = existsChecker.compile(args[0])
      return {
        async: true,
        allowUndefineds: false,
        name: 'exists',
        compiledOptions: compiledOptions,
      }
    },
    async validate (value, compiledOptions, options) {
      try {
        await existsChecker.validate(value, compiledOptions, options)
      } catch (error) {
        options.errorReporter.report(options.pointer, 'exists', error.message, options.arrayExpressionPointer)
      }
    },
  })

  /**
   * Unique rule to check if value is unique or not
   */
  const uniqueChecker = new DbRowCheck('unique', database)
  validator.addRule('unique', {
    compile (_, __, args) {
      const compiledOptions = uniqueChecker.compile(args[0])
      return {
        async: true,
        allowUndefineds: false,
        name: 'unique',
        compiledOptions: compiledOptions,
      }
    },
    async validate (value, compiledOptions, options) {
      try {
        await uniqueChecker.validate(value, compiledOptions, options)
      } catch (error) {
        options.errorReporter.report(options.pointer, 'unique', error.message, options.arrayExpressionPointer)
      }
    },
  })
}
