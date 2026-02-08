/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseCommand, args, flags } from '@adonisjs/core/ace'
import { stubsRoot } from '../stubs/main.js'
import { type CommandOptions } from '@adonisjs/core/types/ace'
import {
  type ModelPropertyType,
  type ModelRelationType,
  getPropertyTsType,
  getRelationTypeName,
  getInverseRelation,
} from '../src/utils/index.js'

/**
 * Represents a model property (column)
 */
interface ModelProperty {
  name: string
  type: ModelPropertyType
  nullable: boolean
}

/**
 * Represents a model relation
 */
interface ModelRelation {
  name: string
  type: ModelRelationType
  relatedModel: string
  throughModel?: string
}

export default class MakeModel extends BaseCommand {
  static commandName = 'make:model'
  static description = 'Make a new Lucid model'
  static options: CommandOptions = {
    allowUnknownFlags: true,
  }

  /**
   * The name of the model file.
   */
  @args.string({ description: 'Name of the model class' })
  declare name: string

  /**
   * Defines if we generate the migration for the model.
   */
  @flags.boolean({
    name: 'migration',
    alias: 'm',
    description: 'Generate the migration for the model',
  })
  declare migration: boolean

  /**
   * Defines if we generate the controller for the model.
   */
  @flags.boolean({
    name: 'controller',
    alias: 'c',
    description: 'Generate the controller for the model',
  })
  declare controller: boolean

  /**
   * Defines if we generate the factory for the model.
   */
  @flags.boolean({
    name: 'factory',
    alias: 'f',
    description: 'Generate a factory for the model',
  })
  declare factory: boolean

  /**
   * Defines if we run in interactive mode to collect properties
   */
  @flags.boolean({
    name: 'interactive',
    alias: 'i',
    description: 'Define model properties interactively',
  })
  declare interactive: boolean

  /**
   * Run migrations
   */
  private async runMakeMigration() {
    if (!this.migration || this.exitCode) {
      return
    }

    const makeMigration = await this.kernel.exec('make:migration', [this.name])
    this.exitCode = makeMigration.exitCode
    this.error = makeMigration.error
  }

  /**
   * Make controller
   */
  private async runMakeController() {
    if (!this.controller || this.exitCode) {
      return
    }

    const makeController = await this.kernel.exec('make:controller', [this.name])
    this.exitCode = makeController.exitCode
    this.error = makeController.error
  }

  /**
   * Make factory
   */
  private async runMakeFactory() {
    if (!this.factory || this.exitCode) {
      return
    }

    const makeFactory = await this.kernel.exec('make:factory', [this.name])
    this.exitCode = makeFactory.exitCode
    this.error = makeFactory.error
  }

  /**
   * Collect properties and relations interactively
   */
  async collectPropertiesInteractively(): Promise<{
    properties: ModelProperty[]
    relations: ModelRelation[]
  }> {
    const properties: ModelProperty[] = []
    const relations: ModelRelation[] = []

    while (true) {
      const name = await this.prompt.ask('Property name (or press Enter to finish)')
      if (!name) break

      const type = await this.prompt.choice('Property type', [
        { name: 'string', message: 'string' },
        { name: 'number', message: 'number' },
        { name: 'boolean', message: 'boolean' },
        { name: 'date', message: 'date (DateTime)' },
        { name: 'dateTime', message: 'dateTime (DateTime with time)' },
        { name: 'relation', message: 'Relation to another model' },
      ])

      if (type === 'relation') {
        const relationType = await this.prompt.choice('Relation type', [
          { name: 'belongsTo', message: 'belongsTo - This model has a foreign key' },
          { name: 'hasOne', message: 'hasOne - Related model has a foreign key' },
          { name: 'hasMany', message: 'hasMany - Related models have foreign keys' },
          { name: 'manyToMany', message: 'manyToMany - Pivot table relationship' },
          { name: 'hasManyThrough', message: 'hasManyThrough - Through intermediate model' },
        ])

        const relatedModel = await this.prompt.ask('Related model name (e.g., User)')

        let throughModel: string | undefined
        if (relationType === 'hasManyThrough') {
          throughModel = await this.prompt.ask('Through model name (e.g., Post)')
        }

        relations.push({
          name,
          type: relationType as ModelRelationType,
          relatedModel,
          throughModel,
        })
      } else {
        const nullable = await this.prompt.confirm('Is this property nullable?', {
          default: false,
        })
        properties.push({ name, type: type as ModelPropertyType, nullable })
      }
    }

    return { properties, relations }
  }

  /**
   * Format properties for stub template
   */
  formatPropertiesForStub(properties: ModelProperty[]) {
    return properties.map((p) => ({
      name: p.name,
      tsType: getPropertyTsType(p.type),
      isDate: p.type === 'date',
      isDateTime: p.type === 'dateTime',
      nullable: p.nullable,
    }))
  }

  /**
   * Format relations for stub template
   */
  formatRelationsForStub(relations: ModelRelation[]) {
    return relations.map((r) => ({
      name: r.name,
      decorator: r.type,
      relatedModel: r.relatedModel,
      throughModel: r.throughModel,
      typeName: getRelationTypeName(r.type),
    }))
  }

  /**
   * Generate class body content with proper spacing
   */
  generateClassBody(properties: ModelProperty[], relations: ModelRelation[]): string {
    if (properties.length === 0 && relations.length === 0) {
      return ''
    }

    const lines: string[] = []

    properties.forEach((p, index) => {
      if (index > 0) lines.push('')

      if (p.type === 'date') {
        lines.push('  @column.date()')
      } else if (p.type === 'dateTime') {
        lines.push('  @column.dateTime()')
      } else {
        lines.push('  @column()')
      }

      const tsType = getPropertyTsType(p.type)
      const nullableSuffix = p.nullable ? ' | null' : ''
      lines.push(`  declare ${p.name}: ${tsType}${nullableSuffix}`)
    })

    relations.forEach((r, index) => {
      if (index > 0 || properties.length > 0) lines.push('')

      const throughPart = r.throughModel ? `, () => ${r.throughModel}` : ''
      lines.push(`  @${r.type}(() => ${r.relatedModel}${throughPart})`)

      const typeName = getRelationTypeName(r.type)
      lines.push(`  declare ${r.name}: ${typeName}<typeof ${r.relatedModel}>`)
    })

    return '\n' + lines.join('\n')
  }

  /**
   * Get unique relation type imports
   */
  getRelationTypeImports(relations: ModelRelation[]) {
    const types = new Set(relations.map((r) => getRelationTypeName(r.type)))
    return [...types]
  }

  /**
   * Get related model imports
   */
  getRelatedModelImports(relations: ModelRelation[]) {
    const models = new Set<string>()
    relations.forEach((r) => {
      models.add(r.relatedModel)
      if (r.throughModel) models.add(r.throughModel)
    })
    return [...models].map((m) => ({
      className: m,
      fileName: this.app.generators.modelFileName(m).replace('.ts', ''),
    }))
  }

  /**
   * Print instructions for inverse relations
   */
  printInverseRelationInstructions(relations: ModelRelation[]) {
    if (relations.length === 0) return

    const modelName = this.app.generators.modelName(this.name)
    const modelFileName = this.app.generators.modelFileName(this.name).replace('.ts', '')

    this.logger.log('')
    this.logger.info('To complete the relationships, add the following to the related models:')
    this.logger.log('')

    for (const relation of relations) {
      const inverse = getInverseRelation(relation.type, modelName)
      if (!inverse) continue

      this.logger.log(this.colors.cyan(`In ${relation.relatedModel} model:`))
      this.logger.log(this.colors.dim(`  import ${modelName} from '#models/${modelFileName}'`))
      this.logger.log(
        this.colors.dim(`  import { ${inverse.decorator} } from '@adonisjs/lucid/orm'`)
      )
      this.logger.log(
        this.colors.dim(`  import type { ${inverse.type} } from '@adonisjs/lucid/types/relations'`)
      )
      this.logger.log('')
      this.logger.log(`  @${inverse.decorator}(() => ${modelName})`)
      this.logger.log(`  declare ${inverse.propertyName}: ${inverse.type}<typeof ${modelName}>`)
      this.logger.log('')
    }
  }

  /**
   * Execute command
   */
  async run(): Promise<void> {
    let properties: ModelProperty[] = []
    let relations: ModelRelation[] = []

    if (this.interactive) {
      const collected = await this.collectPropertiesInteractively()
      properties = collected.properties
      relations = collected.relations
    }

    const codemods = await this.createCodemods()
    await codemods.makeUsingStub(stubsRoot, 'make/model/main.stub', {
      flags: this.parsed.flags,
      entity: this.app.generators.createEntity(this.name),
      properties: this.formatPropertiesForStub(properties),
      relations: this.formatRelationsForStub(relations),
      hasProperties: properties.length > 0,
      hasRelations: relations.length > 0,
      hasDateColumns: properties.some((p) => p.type === 'date' || p.type === 'dateTime'),
      relationDecorators: [...new Set(relations.map((r) => r.type))],
      relationTypes: this.getRelationTypeImports(relations),
      relatedModelImports: this.getRelatedModelImports(relations),
      classBody: this.generateClassBody(properties, relations),
    })

    if (this.interactive) {
      this.printInverseRelationInstructions(relations)
    }

    await this.runMakeMigration()
    await this.runMakeController()
    await this.runMakeFactory()
  }
}
