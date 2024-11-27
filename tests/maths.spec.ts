import { test } from '@japa/runner'

test.group('Maths.add', () => {
  test('add two numbers', ({ expect }) => {
    // Test logic goes here
    expect(1 + 1).toBe(2)
  })
})
