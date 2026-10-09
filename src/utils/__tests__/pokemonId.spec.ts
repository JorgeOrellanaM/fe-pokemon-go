import { describe, expect, it } from 'vitest'
import { parsePokemonId } from '@/utils/pokemonId'

describe('parsePokemonId', () => {
  it('accepts positive whole numbers', () => {
    expect(parsePokemonId('1')).toBe(1)
    expect(parsePokemonId('25')).toBe(25)
    expect(parsePokemonId(['133'])).toBe(133)
  })

  it.each([['0'], ['-1'], ['abc'], ['1.5'], ['25abc'], [' 25'], [''], ['99999999999999999999']])(
    'rejects %j',
    (value) => {
      expect(parsePokemonId(value)).toBeNull()
    },
  )

  it('rejects a missing param', () => {
    expect(parsePokemonId(undefined)).toBeNull()
  })
})
