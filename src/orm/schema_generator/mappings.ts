/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Known internal type identifiers that can be customized via schema rules
 */
export const INTERNAL_TYPES = {
  NUMBER: 'number',
  BIGINT: 'bigint',
  DECIMAL: 'decimal',
  BOOLEAN: 'boolean',
  STRING: 'string',
  DATE: 'date',
  TIME: 'time',
  DATE_TIME: 'DateTime',
  BINARY: 'binary',
  JSON: 'json',
  JSONB: 'jsonb',
  UUID: 'uuid',
  ENUM: 'enum',
  SET: 'set',
  UNKNOWN: 'unknown',
} as const

/**
 * Mapping from database types to internal type identifiers.
 * This mapping covers PostgreSQL, MySQL, SQLite, and MSSQL types.
 */
export const DATA_TYPES_MAPPING: Record<string, string> = {
  /**
   * Numeric types
   */
  'smallint': INTERNAL_TYPES.NUMBER,
  'integer': INTERNAL_TYPES.NUMBER,
  'int': INTERNAL_TYPES.NUMBER,
  'bigint': INTERNAL_TYPES.BIGINT,
  'unsigned big int': INTERNAL_TYPES.BIGINT,
  'decimal': INTERNAL_TYPES.DECIMAL,
  'numeric': INTERNAL_TYPES.DECIMAL,
  'real': INTERNAL_TYPES.NUMBER,
  'double': INTERNAL_TYPES.NUMBER,
  'double precision': INTERNAL_TYPES.NUMBER,
  'float': INTERNAL_TYPES.NUMBER,
  'money': INTERNAL_TYPES.DECIMAL,

  // MySQL numeric types
  'tinyint': INTERNAL_TYPES.BOOLEAN, // MySQL uses tinyint(1) for boolean columns
  'mediumint': INTERNAL_TYPES.NUMBER,

  // MSSQL numeric types
  'smallmoney': INTERNAL_TYPES.DECIMAL,

  // PostgreSQL serial types
  'smallserial': INTERNAL_TYPES.NUMBER,
  'serial': INTERNAL_TYPES.NUMBER,
  'bigserial': INTERNAL_TYPES.BIGINT,

  // PostgreSQL aliases
  'int2': INTERNAL_TYPES.NUMBER,
  'int4': INTERNAL_TYPES.NUMBER,
  'int8': INTERNAL_TYPES.BIGINT,
  'float4': INTERNAL_TYPES.NUMBER,
  'float8': INTERNAL_TYPES.NUMBER,

  /**
   * Boolean types
   */
  'boolean': INTERNAL_TYPES.BOOLEAN,
  'bool': INTERNAL_TYPES.BOOLEAN,

  /**
   * Character/Text types
   */
  'char': INTERNAL_TYPES.STRING,
  'character': INTERNAL_TYPES.STRING,
  'character varying': INTERNAL_TYPES.STRING,
  'varchar': INTERNAL_TYPES.STRING,
  'text': INTERNAL_TYPES.STRING,

  // MySQL text types
  'tinytext': INTERNAL_TYPES.STRING,
  'mediumtext': INTERNAL_TYPES.STRING,
  'longtext': INTERNAL_TYPES.STRING,

  // SQLite text types
  'nchar': INTERNAL_TYPES.STRING,
  'nvarchar': INTERNAL_TYPES.STRING,
  'clob': INTERNAL_TYPES.STRING,

  // MSSQL text types
  'ntext': INTERNAL_TYPES.STRING,
  'sysname': INTERNAL_TYPES.STRING,

  /**
   * Date/Time types
   */
  'date': INTERNAL_TYPES.DATE,
  'time': INTERNAL_TYPES.TIME,
  'datetime': INTERNAL_TYPES.DATE_TIME,
  'timestamp': INTERNAL_TYPES.DATE_TIME,

  // PostgreSQL date/time types
  'timestamp without time zone': INTERNAL_TYPES.DATE_TIME,
  'timestamp with time zone': INTERNAL_TYPES.DATE_TIME,
  'time without time zone': INTERNAL_TYPES.TIME,
  'time with time zone': INTERNAL_TYPES.TIME,
  'interval': INTERNAL_TYPES.STRING,

  // MSSQL date/time types
  'smalldatetime': INTERNAL_TYPES.DATE_TIME,
  'datetime2': INTERNAL_TYPES.DATE_TIME,
  'datetimeoffset': INTERNAL_TYPES.DATE_TIME,

  // MySQL date/time types
  'year': INTERNAL_TYPES.NUMBER,

  /**
   * Binary/Blob types
   */
  'bytea': INTERNAL_TYPES.BINARY,
  'blob': INTERNAL_TYPES.BINARY,

  // MySQL blob types
  'tinyblob': INTERNAL_TYPES.BINARY,
  'mediumblob': INTERNAL_TYPES.BINARY,
  'longblob': INTERNAL_TYPES.BINARY,

  'binary': INTERNAL_TYPES.BINARY,
  'varbinary': INTERNAL_TYPES.BINARY,

  // MSSQL binary types
  'image': INTERNAL_TYPES.BINARY,
  'rowversion': INTERNAL_TYPES.BINARY,

  /**
   * JSON/Structured types
   */
  'json': INTERNAL_TYPES.JSON,
  'jsonb': INTERNAL_TYPES.JSONB,
  'xml': INTERNAL_TYPES.STRING,

  // MSSQL variant type
  'sql_variant': INTERNAL_TYPES.UNKNOWN,

  /**
   * UUID/Identifier types
   */
  'uuid': INTERNAL_TYPES.UUID,

  // MSSQL UUID
  'uniqueidentifier': INTERNAL_TYPES.UUID,

  /**
   * Enum/Set types
   */
  'enum': INTERNAL_TYPES.ENUM,
  'set': INTERNAL_TYPES.SET,

  /**
   * Bit string types (PostgreSQL)
   */
  'bit': INTERNAL_TYPES.STRING,
  'bit varying': INTERNAL_TYPES.STRING,

  /**
   * Bit boolean types (MSSQL)
   */
  'mssql.bit': INTERNAL_TYPES.BOOLEAN,

  /**
   * Network types (PostgreSQL)
   */
  'inet': INTERNAL_TYPES.STRING,
  'cidr': INTERNAL_TYPES.STRING,
  'macaddr': INTERNAL_TYPES.STRING,
  'macaddr8': INTERNAL_TYPES.STRING,

  /**
   * Full-text search types (PostgreSQL)
   */
  'tsvector': INTERNAL_TYPES.STRING,
  'tsquery': INTERNAL_TYPES.STRING,

  /**
   * Range types (PostgreSQL)
   */
  'int4range': INTERNAL_TYPES.UNKNOWN,
  'int8range': INTERNAL_TYPES.UNKNOWN,
  'numrange': INTERNAL_TYPES.UNKNOWN,
  'tsrange': INTERNAL_TYPES.UNKNOWN,
  'tstzrange': INTERNAL_TYPES.UNKNOWN,
  'daterange': INTERNAL_TYPES.UNKNOWN,

  // Multirange types (PostgreSQL 14+)
  'int4multirange': INTERNAL_TYPES.UNKNOWN,
  'int8multirange': INTERNAL_TYPES.UNKNOWN,
  'nummultirange': INTERNAL_TYPES.UNKNOWN,
  'tsmultirange': INTERNAL_TYPES.UNKNOWN,
  'tstzmultirange': INTERNAL_TYPES.UNKNOWN,
  'datemultirange': INTERNAL_TYPES.UNKNOWN,

  /**
   * Geometry/Spatial types
   */
  'geometry': INTERNAL_TYPES.UNKNOWN,
  'geography': INTERNAL_TYPES.UNKNOWN,
  'point': INTERNAL_TYPES.STRING,
  'line': INTERNAL_TYPES.STRING,
  'lseg': INTERNAL_TYPES.STRING,
  'box': INTERNAL_TYPES.STRING,
  'path': INTERNAL_TYPES.STRING,
  'polygon': INTERNAL_TYPES.STRING,
  'circle': INTERNAL_TYPES.STRING,
  'multipoint': INTERNAL_TYPES.STRING,
  'multilinestring': INTERNAL_TYPES.STRING,
  'multipolygon': INTERNAL_TYPES.STRING,
  'geometrycollection': INTERNAL_TYPES.STRING,

  /**
   * Object identifier types (PostgreSQL)
   */
  'oid': INTERNAL_TYPES.NUMBER,
  'regclass': INTERNAL_TYPES.STRING,
  'regproc': INTERNAL_TYPES.STRING,
  'regprocedure': INTERNAL_TYPES.STRING,
  'regoper': INTERNAL_TYPES.STRING,
  'regoperator': INTERNAL_TYPES.STRING,
  'regtype': INTERNAL_TYPES.STRING,
  'regrole': INTERNAL_TYPES.STRING,
  'regnamespace': INTERNAL_TYPES.STRING,

  /**
   * PostgreSQL special types
   */
  'hstore': INTERNAL_TYPES.UNKNOWN,
  'pg_lsn': INTERNAL_TYPES.STRING,
  'name': INTERNAL_TYPES.STRING,
  'pg_snapshot': INTERNAL_TYPES.STRING,
  'txid_snapshot': INTERNAL_TYPES.STRING,

  /**
   * MSSQL special types
   */
  'hierarchyid': INTERNAL_TYPES.STRING,

  /**
   * SQLite type variants (case-insensitive but returned in uppercase)
   */
  'INTEGER': INTERNAL_TYPES.NUMBER,
  'REAL': INTERNAL_TYPES.NUMBER,
  'TEXT': INTERNAL_TYPES.STRING,
  'BLOB': INTERNAL_TYPES.BINARY,
  'NUMERIC': INTERNAL_TYPES.NUMBER, // SQLite NUMERIC affinity doesn't preserve exact decimal precision
}
