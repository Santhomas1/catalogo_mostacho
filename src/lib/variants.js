export function variantLabel(variant) {
  const name = variant.name?.trim() || ''
  const details = [variant.material, variant.color].filter(value => value?.trim() && !name.toLocaleLowerCase('es').includes(value.trim().toLocaleLowerCase('es')))
  return [name, ...details].filter(Boolean).join(' · ')
}
