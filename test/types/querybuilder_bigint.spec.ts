import { test } from '@japa/runner'
import type { StrictValues, RawQueryBindings, RawQueryFn, ChainableContract } from '../../src/types/querybuilder.js'

test.group('Types | QueryBuilder bigint', () => {
  test('accept bigint in StrictValues/RawQueryBindings', ({ expectTypeOf }) => {
    const v1: StrictValues = 1n
    expectTypeOf(v1).toMatchTypeOf<bigint>()

    const v2: StrictValues = [1n, 2n]
    expectTypeOf(v2).toMatchTypeOf<bigint[]>()

    const b1: RawQueryBindings = [1n]
    expectTypeOf(b1).toMatchTypeOf<StrictValues[]>()

    const b2: RawQueryBindings = { id: 1n }
    expectTypeOf(b2).toMatchTypeOf<{ [key: string]: StrictValues }>()

    type Builder = ChainableContract
    const fn: RawQueryFn<Builder> = ((..._args: any[]) => ({} as Builder)) as any

    fn('select ?', [1n])
    fn('select :id', { id: 1n })
  })

  test('reject unsupported types', () => {
    // @ts-expect-error
    const v1: StrictValues = Symbol('nope')

    // @ts-expect-error
    const v2: StrictValues = [Symbol('nope')]

    // @ts-expect-error
    const b1: RawQueryBindings = [Symbol('nope')]

    // @ts-expect-error
    const b2: RawQueryBindings = { id: Symbol('nope') }
  })
})
